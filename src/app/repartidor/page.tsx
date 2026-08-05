import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { OrderCard, type RepartidorOrder } from "@/components/repartidor/OrderCard";

export default async function RepartidorHomePage() {
  const profile = await requireRole(["repartidor"]);
  const supabase = await createClient();

  // RLS (repartidor_manage_assigned_orders) ya limita esto a pedidos propios
  // — el filtro explícito acá es defensa en profundidad, no la única barrera.
  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, status, total, delivery_issue_reason, delivery_code_locked, user_id, address_id",
    )
    .eq("assigned_driver_id", profile.id)
    .in("status", ["driver_assigned", "in_route", "at_address", "delivery_issue"])
    .order("created_at");

  const list = orders ?? [];
  const userIds = [...new Set(list.map((o) => o.user_id))];
  const addressIds = [...new Set(list.map((o) => o.address_id).filter((v): v is string => !!v))];

  const [{ data: customers }, { data: addresses }] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id, full_name, phone").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string; phone: string | null }[] }),
    addressIds.length
      ? supabase.from("addresses").select("id, calle, numero, comuna, ciudad").in("id", addressIds)
      : Promise.resolve({
          data: [] as { id: string; calle: string; numero: string; comuna: string; ciudad: string }[],
        }),
  ]);

  const customerMap = new Map((customers ?? []).map((c) => [c.id, c]));
  const addressMap = new Map((addresses ?? []).map((a) => [a.id, a]));

  const enriched: RepartidorOrder[] = list.map((o) => ({
    id: o.id,
    status: o.status,
    total: o.total,
    delivery_issue_reason: o.delivery_issue_reason,
    delivery_code_locked: o.delivery_code_locked,
    customer: customerMap.get(o.user_id) ?? null,
    address: o.address_id ? (addressMap.get(o.address_id) ?? null) : null,
  }));

  return (
    <div>
      <h1 className="text-xl font-semibold text-gold">Mis pedidos asignados</h1>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {enriched.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
        {enriched.length === 0 && (
          <p className="text-sm text-foreground/50">No tenés pedidos asignados por ahora.</p>
        )}
      </div>
    </div>
  );
}
