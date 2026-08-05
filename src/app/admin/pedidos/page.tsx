import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { AdminOrderRow } from "@/components/admin/AdminOrderRow";

export default async function AdminPedidosPage() {
  await requireRole(["admin", "operaciones"]);
  const supabase = await createClient();

  // RLS (operaciones_manage_orders_in_scope / admin_manage_orders) ya limita
  // esto por sucursal para Operaciones — acá solo se excluyen los pedidos que
  // todavía no son "reales" (pending_payment) para no saturar la vista.
  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, delivery_method, total, created_at, store_id")
    .neq("status", "pending_payment")
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: repartidores } = await supabase
    .from("profiles")
    .select("id, full_name, store_id")
    .eq("role", "repartidor");

  const driversByStore = new Map<string, { id: string; full_name: string }[]>();
  for (const d of repartidores ?? []) {
    if (!d.store_id) continue;
    const list = driversByStore.get(d.store_id) ?? [];
    list.push({ id: d.id, full_name: d.full_name });
    driversByStore.set(d.store_id, list);
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gold">Gestión de pedidos</h1>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-charcoal-border text-xs uppercase tracking-wide text-foreground/50">
              <th className="py-2 pr-3 font-normal">Pedido</th>
              <th className="py-2 pr-3 font-normal">Estado</th>
              <th className="py-2 pr-3 font-normal">Entrega</th>
              <th className="py-2 pr-3 font-normal">Total</th>
              <th className="py-2 pr-3 font-normal">Fecha</th>
              <th className="py-2 font-normal">Acción</th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((order) => (
              <AdminOrderRow
                key={order.id}
                order={order}
                drivers={driversByStore.get(order.store_id) ?? []}
              />
            ))}
          </tbody>
        </table>
        {(orders ?? []).length === 0 && (
          <p className="mt-4 text-sm text-foreground/50">No hay pedidos todavía.</p>
        )}
      </div>
    </div>
  );
}
