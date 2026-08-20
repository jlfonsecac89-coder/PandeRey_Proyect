import Link from "next/link";
import { Package, Calendar, Truck, Store } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatCLP } from "@/lib/format";
import { STATUS_LABELS, type OrderStatus } from "@/lib/orders/status";
import { ReorderButton } from "@/components/storefront/ReorderButton";
import { ReviewForm } from "@/components/storefront/ReviewForm";

// Color del badge por estado — verde = terminado bien, ámbar = esperando
// una acción del cliente, azul = en curso, burdeos = problema/cancelado.
function statusStyle(status: OrderStatus): string {
  switch (status) {
    case "delivered":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
    case "ready":
    case "ready_for_pickup":
      return "border-gold/30 bg-gold/10 text-gold";
    case "delivery_issue":
    case "returning_to_store":
    case "returned_to_store":
    case "cancelled":
      return "border-burgundy/40 bg-burgundy/15 text-burgundy-hover";
    default:
      return "border-sky-500/20 bg-sky-500/10 text-sky-300";
  }
}

export default async function MisPedidosPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, total, delivery_method, delivery_confirmation_code, created_at")
    .eq("user_id", profile.id)
    .neq("status", "pending_payment")
    .order("created_at", { ascending: false });

  const deliveredOrderIds = (orders ?? []).filter((o) => o.status === "delivered").map((o) => o.id);

  const [{ data: deliveredItems }, { data: existingReviews }] = await Promise.all([
    deliveredOrderIds.length
      ? supabase
          .from("order_items")
          .select("id, order_id, product_id, product_name_snapshot")
          .in("order_id", deliveredOrderIds)
      : Promise.resolve({ data: [] as { id: string; order_id: string; product_id: string; product_name_snapshot: string }[] }),
    deliveredOrderIds.length
      ? supabase.from("product_reviews").select("order_item_id").eq("user_id", profile.id)
      : Promise.resolve({ data: [] as { order_item_id: string }[] }),
  ]);

  const reviewedItemIds = new Set((existingReviews ?? []).map((r) => r.order_item_id));
  const itemsByOrder = new Map<string, typeof deliveredItems>();
  for (const item of deliveredItems ?? []) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">Historial</p>
          <h1 className="mt-1 font-display text-2xl font-medium text-foreground">Mis pedidos</h1>
          <p className="mt-1 text-xs text-foreground-muted">
            Revisá tus compras anteriores y repetí un pedido con un clic.
          </p>
        </div>
        <Link
          href="/tienda"
          className="self-start rounded-lg border border-gold/30 bg-gold/5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gold transition-all duration-300 hover:border-gold hover:text-foreground sm:self-center"
        >
          Explorar tienda
        </Link>
      </div>

      <ul className="mt-6 space-y-4">
        {(orders ?? []).map((order) => {
          const pendingReviewItems = (itemsByOrder.get(order.id) ?? []).filter(
            (item) => !reviewedItemIds.has(item.id),
          );
          const status = order.status as OrderStatus;
          const isPickup = order.delivery_method === "pickup";
          const showConfirmationCode =
            order.delivery_method === "shipping" && !["delivered", "cancelled"].includes(status);
          return (
            <li
              key={order.id}
              className="rounded-2xl border border-crust-soft bg-masa p-5 transition-colors hover:border-gold-dark/40"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-gold">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/pedido/${order.id}`}
                        className="font-mono text-xs font-bold uppercase tracking-widest text-foreground hover:text-gold"
                      >
                        Pedido #{order.id.slice(0, 8)}
                      </Link>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusStyle(status)}`}
                      >
                        {STATUS_LABELS[status] ?? order.status}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-foreground-muted">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-foreground-muted/60" />
                        {new Date(order.created_at).toLocaleDateString("es-CL")}
                      </span>
                      <span className="h-1.5 w-1.5 rounded-full bg-white/10" />
                      <span className="flex items-center gap-1.5">
                        {isPickup ? (
                          <>
                            <Store className="h-3.5 w-3.5 text-gold/80" />
                            Retiro en tienda
                          </>
                        ) : (
                          <>
                            <Truck className="h-3.5 w-3.5 text-gold/80" />
                            Envío a domicilio
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-5 border-t border-white/5 pt-4 md:justify-end md:border-0 md:pt-0">
                  <div className="md:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">Total</p>
                    <p className="font-display text-xl font-black text-gold">{formatCLP(order.total)}</p>
                  </div>
                  <ReorderButton orderId={order.id} />
                </div>
              </div>

              {showConfirmationCode && (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-dashed border-gold-dark/50 bg-ink px-4 py-3">
                  <p className="text-xs text-foreground-muted">
                    Código de confirmación para la entrega
                  </p>
                  <p className="font-mono text-lg font-bold tracking-[0.2em] text-gold">
                    {order.delivery_confirmation_code}
                  </p>
                </div>
              )}

              {pendingReviewItems.length > 0 && (
                <div className="mt-4 border-t border-white/10 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                    ¿Qué te pareció tu pedido?
                  </p>
                  {pendingReviewItems.map((item) => (
                    <ReviewForm
                      key={item!.id}
                      orderItemId={item!.id}
                      productId={item!.product_id}
                      orderId={order.id}
                      productName={item!.product_name_snapshot}
                    />
                  ))}
                </div>
              )}
            </li>
          );
        })}
        {(orders ?? []).length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/15 py-12 text-center">
            <p className="text-sm text-foreground-muted">Todavía no hiciste ningún pedido.</p>
            <Link href="/tienda" className="mt-2 inline-block text-xs text-gold-hover hover:underline">
              Ir a la tienda →
            </Link>
          </div>
        )}
      </ul>
    </div>
  );
}
