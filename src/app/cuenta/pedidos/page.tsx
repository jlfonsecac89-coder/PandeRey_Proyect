import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatCLP } from "@/lib/format";
import { STATUS_LABELS, type OrderStatus } from "@/lib/orders/status";
import { ReorderButton } from "@/components/storefront/ReorderButton";
import { ReviewForm } from "@/components/storefront/ReviewForm";

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
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">Historial</p>
      <h1 className="mt-1 font-display text-2xl font-medium text-foreground">Mis pedidos</h1>
      <ul className="mt-5 space-y-3">
        {(orders ?? []).map((order) => {
          const pendingReviewItems = (itemsByOrder.get(order.id) ?? []).filter(
            (item) => !reviewedItemIds.has(item.id),
          );
          return (
            <li
              key={order.id}
              className="rounded-2xl border border-charcoal-border bg-background-elevated p-5 shadow-card"
            >
              <div className="flex items-center justify-between">
                <div>
                  <Link href={`/pedido/${order.id}`} className="font-mono text-xs text-gold-dark hover:underline">
                    #{order.id.slice(0, 8)}
                  </Link>
                  <p className="text-sm font-medium text-foreground">
                    {STATUS_LABELS[order.status as OrderStatus] ?? order.status}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {new Date(order.created_at).toLocaleDateString("es-CL")} ·{" "}
                    {order.delivery_method === "pickup" ? "Retiro" : "Envío"}
                  </p>
                </div>
                <p className="text-sm font-semibold text-gold">{formatCLP(order.total)}</p>
              </div>
              <div className="mt-3">
                <ReorderButton orderId={order.id} />
              </div>

              {pendingReviewItems.length > 0 && (
                <div className="mt-4 border-t border-charcoal-border pt-4">
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
          <div className="rounded-2xl border border-dashed border-charcoal-border py-12 text-center">
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
