import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { confirmPayment } from "@/lib/mercadopago/confirm-payment";
import { formatCLP } from "@/lib/format";
import { ClearCartOnSuccess } from "@/components/storefront/ClearCartOnSuccess";
import { Seal } from "@/components/storefront/Seal";

export default async function CheckoutResultadoPage({
  searchParams,
}: {
  searchParams: Promise<{
    order?: string;
    payment_id?: string;
    status?: string;
    collection_status?: string;
  }>;
}) {
  const { order: orderId, payment_id: paymentId, status, collection_status } = await searchParams;
  const mpStatus = status ?? collection_status;

  // Fallback defensivo: en desarrollo Mercado Pago no puede alcanzar
  // localhost para entregar el webhook, así que confirmamos acá también.
  // En producción esto es puramente redundante con el webhook (idempotente
  // por `payments.mp_payment_id`, ver lib/mercadopago/confirm-payment.ts).
  if (paymentId && mpStatus === "approved") {
    try {
      await confirmPayment(paymentId);
    } catch {
      // el webhook real puede terminar de confirmarlo más tarde
    }
  }

  // El reenvío pagado tras `returned_to_store` (lib/checkout/actions.ts,
  // payResendShipping) usa "<order_id>:resend" como external_reference —
  // acá solo interesa el id real del pedido para mostrar su estado.
  const cleanOrderId = orderId?.split(":")[0];

  let order: { id: string; status: string; total: number; delivery_method: string } | null = null;
  if (cleanOrderId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("orders")
      .select("id, status, total, delivery_method")
      .eq("id", cleanOrderId)
      .maybeSingle();
    order = data;
  }

  const isPaid = !!order && order.status !== "pending_payment" && order.status !== "cancelled";

  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      {isPaid ? (
        <>
          <ClearCartOnSuccess />
          <div className="flex justify-center">
            <Seal dropOnVisible />
          </div>
          <h1 className="mt-4 font-display text-2xl font-medium text-foreground">Pedido sellado</h1>
          <p className="mt-2 text-sm text-foreground-muted">Tu pedido fue confirmado.</p>

          <div className="mt-6 space-y-2 rounded-2xl border border-dashed border-crust bg-masa p-5 text-left text-sm shadow-card">
            <div className="flex justify-between">
              <span className="text-foreground-muted">Código de pedido</span>
              <span className="font-mono text-xs text-gold-dark">{order!.id.slice(0, 8).toUpperCase()}</span>
            </div>
            {paymentId && (
              <div className="flex justify-between">
                <span className="text-foreground-muted">Transacción Mercado Pago</span>
                <span className="font-mono text-xs text-foreground">{paymentId}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-charcoal-border pt-2">
              <span className="text-foreground-muted">Total pagado</span>
              <span className="font-semibold text-gold">{formatCLP(order!.total)}</span>
            </div>
          </div>

          <p className="mt-4 text-xs text-foreground-muted">
            Te va a llegar un email de confirmación con el detalle de tu pedido
            {order!.delivery_method === "pickup"
              ? " y el código para validar el retiro en tienda."
              : " y el código de confirmación que le vas a dar al repartidor."}
          </p>

          <Link
            href={`/seguimiento/${order!.id}`}
            className="mt-6 inline-block rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-ink shadow-card transition hover:bg-gold-hover"
          >
            Seguir mi pedido
          </Link>
        </>
      ) : mpStatus === "pending" || mpStatus === "in_process" ? (
        <>
          <h1 className="font-display text-2xl font-medium text-foreground">Pago pendiente</h1>
          <p className="mt-2 text-sm text-foreground-muted">Te avisaremos apenas se confirme el pago.</p>
        </>
      ) : (
        <>
          <h1 className="font-display text-2xl font-medium text-burgundy-hover">El pago no se pudo completar</h1>
          <p className="mt-2 text-sm text-foreground-muted">Podés intentarlo de nuevo desde tu carrito.</p>
        </>
      )}
      <p className="mt-6">
        <Link href="/tienda" className="text-sm text-gold-hover hover:underline">
          Volver a la tienda
        </Link>
      </p>
    </div>
  );
}
