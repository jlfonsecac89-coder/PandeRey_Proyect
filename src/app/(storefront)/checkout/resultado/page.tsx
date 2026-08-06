import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { confirmPayment } from "@/lib/mercadopago/confirm-payment";
import { formatCLP } from "@/lib/format";
import { ClearCartOnSuccess } from "@/components/storefront/ClearCartOnSuccess";

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
          <h1 className="text-xl font-semibold text-gold">¡Gracias por tu compra!</h1>
          <p className="mt-2 text-sm text-foreground/70">Tu pedido fue confirmado.</p>

          <div className="mt-6 space-y-2 rounded-lg border border-charcoal-border bg-charcoal-light p-4 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-foreground/60">Código de pedido</span>
              <span className="font-mono text-xs text-gold-dark">{order!.id.slice(0, 8).toUpperCase()}</span>
            </div>
            {paymentId && (
              <div className="flex justify-between">
                <span className="text-foreground/60">Transacción Mercado Pago</span>
                <span className="font-mono text-xs text-foreground/80">{paymentId}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-charcoal-border pt-2">
              <span className="text-foreground/60">Total pagado</span>
              <span className="font-semibold text-gold">{formatCLP(order!.total)}</span>
            </div>
          </div>

          <p className="mt-4 text-xs text-foreground/50">
            {order!.delivery_method === "pickup"
              ? "Te enviamos por email el código para validar el retiro en tienda."
              : "Te enviamos por email el código de confirmación que le vas a dar al repartidor."}
          </p>

          <Link
            href={`/pedido/${order!.id}`}
            className="mt-4 inline-block text-sm text-gold-hover underline"
          >
            Ver el seguimiento de mi pedido
          </Link>
        </>
      ) : mpStatus === "pending" || mpStatus === "in_process" ? (
        <>
          <h1 className="text-xl font-semibold text-gold">Pago pendiente</h1>
          <p className="mt-2 text-sm text-foreground/70">Te avisaremos apenas se confirme el pago.</p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold text-red-400">El pago no se pudo completar</h1>
          <p className="mt-2 text-sm text-foreground/70">Podés intentarlo de nuevo desde tu carrito.</p>
        </>
      )}
      <Link href="/tienda" className="mt-6 inline-block text-sm text-gold-hover underline">
        Volver a la tienda
      </Link>
    </div>
  );
}
