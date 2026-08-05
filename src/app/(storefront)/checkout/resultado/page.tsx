import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { confirmPayment } from "@/lib/mercadopago/confirm-payment";
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

  let order: { id: string; status: string; total: number } | null = null;
  if (cleanOrderId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("orders")
      .select("id, status, total")
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
