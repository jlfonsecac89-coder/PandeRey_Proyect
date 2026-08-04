import "server-only";
import { Payment } from "mercadopago";
import { getMercadoPagoClient } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";

export type ConfirmPaymentResult =
  | { ok: true; alreadyProcessed: boolean; status?: string }
  | { ok: false; reason: string };

// Punto único que aplica los side-effects de un pago aprobado: usado tanto
// por el webhook (POST /api/webhooks/mercadopago) como por la página de
// retorno del checkout (fallback si el webhook todavía no llegó). La
// idempotencia la da el UNIQUE de `payments.mp_payment_id` — un pago ya
// registrado nunca se vuelve a procesar (sección 07, Fase 4).
export async function confirmPayment(mpPaymentId: string): Promise<ConfirmPaymentResult> {
  const client = getMercadoPagoClient();
  const paymentClient = new Payment(client);

  let data;
  try {
    data = await paymentClient.get({ id: mpPaymentId });
  } catch {
    return { ok: false, reason: "no se pudo consultar el pago en Mercado Pago" };
  }

  const orderId = data.external_reference;
  if (!orderId) return { ok: false, reason: "el pago no trae external_reference" };

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("mp_payment_id", String(data.id))
    .maybeSingle();
  if (existing) return { ok: true, alreadyProcessed: true, status: data.status };

  if (data.status !== "approved") {
    return { ok: true, alreadyProcessed: false, status: data.status };
  }

  const { error: paymentError } = await supabase.from("payments").insert({
    order_id: orderId,
    mp_payment_id: String(data.id),
    status: data.status,
    amount: data.transaction_amount ?? 0,
    raw_webhook_redacted: {
      status: data.status,
      status_detail: data.status_detail,
      payment_method_id: data.payment_method_id,
      payment_type_id: data.payment_type_id,
    },
  });
  if (paymentError) return { ok: false, reason: "no se pudo registrar el pago" };

  await supabase
    .from("orders")
    .update({ status: "paid", mp_payment_id: String(data.id) })
    .eq("id", orderId)
    .eq("status", "pending_payment");

  await supabase.from("order_status_history").insert({
    order_id: orderId,
    status: "paid",
    note: "Confirmado por Mercado Pago",
  });

  return { ok: true, alreadyProcessed: false, status: data.status };
}
