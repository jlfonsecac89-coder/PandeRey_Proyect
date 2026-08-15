import "server-only";
import { Payment } from "mercadopago";
import { getMercadoPagoClient } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotification, getUserEmail } from "@/lib/notifications/send";
import { purchaseConfirmedTemplate } from "@/lib/notifications/templates";
import { orderPrepSlaMinutes } from "@/lib/orders/status";
import { computeEarnedPoints } from "@/lib/loyalty/points";

export type ConfirmPaymentResult =
  | { ok: true; alreadyProcessed: boolean; status?: string }
  | { ok: false; reason: string };

const RESEND_SUFFIX = ":resend";

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

  const rawReference = data.external_reference;
  if (!rawReference) return { ok: false, reason: "el pago no trae external_reference" };

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

  // El pago del reenvío tras `returned_to_store` (sección 07) reusa este
  // mismo webhook con external_reference = "<order_id>:resend" para no
  // duplicar toda la lógica de validación de firma/idempotencia.
  const isResend = rawReference.endsWith(RESEND_SUFFIX);
  const orderId = isResend ? rawReference.slice(0, -RESEND_SUFFIX.length) : rawReference;

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

  if (isResend) {
    await supabase
      .from("orders")
      .update({ status: "driver_assigned" })
      .eq("id", orderId)
      .eq("status", "returned_to_store");
    await supabase.from("order_status_history").insert({
      order_id: orderId,
      status: "driver_assigned",
      note: "Reenvío pagado por el cliente tras devolución a tienda",
    });
    return { ok: true, alreadyProcessed: false, status: data.status };
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, user_id, scheduled_at, total, delivery_confirmation_code, delivery_method")
    .eq("id", orderId)
    .eq("status", "pending_payment")
    .maybeSingle();

  if (!order) {
    // Ya procesado por otra vía, o el pedido no existe — no hay nada más que hacer.
    return { ok: true, alreadyProcessed: false, status: data.status };
  }

  // Sin scheduled_at pasa a 'preparing' de inmediato; con scheduled_at se
  // queda en 'paid' hasta que el cron de SLA lo transicione (sección 07).
  const nextStatus = order.scheduled_at ? "paid" : "preparing";
  const slaDeadline = order.scheduled_at
    ? order.scheduled_at
    : new Date(Date.now() + (await orderPrepSlaMinutes()) * 60000).toISOString();

  await supabase
    .from("orders")
    .update({
      status: nextStatus,
      mp_payment_id: String(data.id),
      sla_deadline: slaDeadline,
    })
    .eq("id", orderId)
    .eq("status", "pending_payment");

  await supabase.from("order_status_history").insert({
    order_id: orderId,
    status: nextStatus,
    note: "Confirmado por Mercado Pago",
  });

  // Aceptación 2 de la Fase 7: acreditación automática al confirmarse el
  // pago (mismo evento que el resto de este bloque) — profiles.points_balance
  // se mantiene consistente solo, vía el trigger sync_points_balance
  // (sección 05) que recalcula la suma del ledger en cada insert.
  const earnedPoints = await computeEarnedPoints(order.total);
  if (earnedPoints > 0) {
    await supabase.from("points_ledger").insert({
      user_id: order.user_id,
      order_id: order.id,
      type: "earn_purchase",
      points: earnedPoints,
      description: `Compra pedido #${order.id.slice(0, 8)}`,
    });
  }

  const email = await getUserEmail(order.user_id);
  if (email) {
    const { subject, html } = purchaseConfirmedTemplate({
      orderId: order.id,
      total: order.total,
      deliveryConfirmationCode: order.delivery_confirmation_code ?? "",
      deliveryMethod: order.delivery_method as "pickup" | "shipping",
    });
    await sendNotification({
      userId: order.user_id,
      orderId: order.id,
      to: email,
      template: "purchase_confirmed",
      subject,
      html,
    });
  }

  return { ok: true, alreadyProcessed: false, status: data.status };
}
