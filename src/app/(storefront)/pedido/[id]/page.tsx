import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCLP } from "@/lib/format";
import { STATUS_LABELS, type OrderStatus } from "@/lib/orders/status";
import { payResendShipping } from "@/lib/checkout/actions";
import { choosePickupFree } from "@/lib/orders/actions";

export default async function SeguimientoPedidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // La RLS de `orders` (customer_select_own_orders) ya hace la "validación
  // de pertenencia" del blueprint: si el pedido no es del usuario logueado,
  // esta consulta devuelve null pese a que la fila exista.
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, status, delivery_method, total, delivery_confirmation_code, scheduled_at, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();
  const orderId = order.id;

  const { data: history } = await supabase
    .from("order_status_history")
    .select("id, status, note, created_at")
    .eq("order_id", id)
    .order("created_at", { ascending: true });

  const status = order.status as OrderStatus;
  const showCode = order.delivery_method === "shipping" && !["delivered", "cancelled"].includes(status);

  // Server Actions usadas directo como `action` de un <form> (sin
  // useActionState) deben devolver void — estos wrappers descartan el
  // {error}/{success} que sí necesitan sus otros usos (ej. useActionState).
  async function payResendShippingForm() {
    "use server";
    await payResendShipping(orderId);
  }
  async function choosePickupFreeForm() {
    "use server";
    await choosePickupFree(orderId);
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">Seguimiento de pedido</p>
      <div className="mt-3 flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-medium text-foreground">{STATUS_LABELS[status] ?? status}</h1>
        <p className="font-mono text-xs text-foreground-muted">#{order.id.slice(0, 8).toUpperCase()}</p>
      </div>
      <p className="mt-1 text-sm text-foreground-muted">Total: {formatCLP(order.total)}</p>

      {showCode && order.delivery_confirmation_code && (
        <div className="mt-6 rounded-2xl border border-charcoal-border bg-background-elevated p-5 text-center shadow-card">
          <p className="text-xs text-foreground-muted">
            Código de confirmación — dáselo al repartidor al entregar tu pedido
          </p>
          <p className="mt-2 text-3xl font-bold tracking-[0.3em] text-gold">{order.delivery_confirmation_code}</p>
        </div>
      )}

      {status === "returned_to_store" && (
        <div className="mt-6 space-y-2 rounded-2xl border border-charcoal-border bg-background-elevated p-5 shadow-card">
          <p className="text-sm text-foreground">
            No pudimos entregar tu pedido y volvió a la tienda. ¿Cómo querés seguir?
          </p>
          <form action={payResendShippingForm}>
            <button
              type="submit"
              className="w-full rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-gold-hover"
            >
              Pagar reenvío
            </button>
          </form>
          <form action={choosePickupFreeForm}>
            <button
              type="submit"
              className="w-full rounded-full border border-charcoal-border px-4 py-2 text-sm text-foreground transition hover:border-gold-dark"
            >
              Retirar gratis en tienda
            </button>
          </form>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Historial</h2>
        <ol className="mt-4 space-y-4 border-l border-charcoal-border pl-4">
          {(history ?? []).map((h) => (
            <li key={h.id}>
              <p className="text-sm font-medium text-foreground">
                {STATUS_LABELS[h.status as OrderStatus] ?? h.status}
              </p>
              {h.note && <p className="text-xs text-foreground-muted">{h.note}</p>}
              <p className="text-xs text-foreground-muted/70">
                {new Date(h.created_at).toLocaleString("es-CL")}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
