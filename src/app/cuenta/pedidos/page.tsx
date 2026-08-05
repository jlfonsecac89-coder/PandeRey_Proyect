import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatCLP } from "@/lib/format";
import { STATUS_LABELS, type OrderStatus } from "@/lib/orders/status";
import { ReorderButton } from "@/components/storefront/ReorderButton";

export default async function MisPedidosPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, total, delivery_method, created_at")
    .eq("user_id", profile.id)
    .neq("status", "pending_payment")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-xl font-semibold text-gold">Mis pedidos</h1>
      <ul className="mt-4 space-y-3">
        {(orders ?? []).map((order) => (
          <li
            key={order.id}
            className="rounded-lg border border-charcoal-border bg-charcoal-light p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <Link href={`/pedido/${order.id}`} className="font-mono text-xs text-gold-dark hover:underline">
                  #{order.id.slice(0, 8)}
                </Link>
                <p className="text-sm text-foreground/90">
                  {STATUS_LABELS[order.status as OrderStatus] ?? order.status}
                </p>
                <p className="text-xs text-foreground/50">
                  {new Date(order.created_at).toLocaleDateString("es-CL")} ·{" "}
                  {order.delivery_method === "pickup" ? "Retiro" : "Envío"}
                </p>
              </div>
              <p className="text-sm font-semibold text-gold">{formatCLP(order.total)}</p>
            </div>
            <div className="mt-2">
              <ReorderButton orderId={order.id} />
            </div>
          </li>
        ))}
        {(orders ?? []).length === 0 && (
          <p className="text-sm text-foreground/50">Todavía no hiciste ningún pedido.</p>
        )}
      </ul>
    </div>
  );
}
