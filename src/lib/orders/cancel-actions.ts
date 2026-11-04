"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { PaymentRefund } from "mercadopago";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/rbac";
import { logAction } from "@/lib/audit/log-action";
import { getMercadoPagoClient } from "@/lib/mercadopago/client";
import { getRefundPolicy } from "@/lib/settings/system-settings";
import { refundPolicySentences } from "./refund-policy";
import { revertDraftConsumption } from "./drafts";
import { getOrderLabel } from "./order-number";
import { CANCEL_REASONS } from "./cancel-reasons";
import { sendNotification, getUserEmail } from "@/lib/notifications/send";
import { orderCancelledTemplate } from "@/lib/notifications/templates";

export type CancelActionState = { error?: string; success?: string } | null;

// Solo un pedido que todavía no se entregó se puede cancelar.
const CANCELABLE_STATUSES = ["paid", "preparing", "ready", "ready_for_pickup"];


type RefundResult = { ok: true; amount: number } | { ok: false; reason: string };

// El SDK de Mercado Pago lanza el cuerpo JSON de la respuesta (no un Error):
// se extrae el mensaje para mostrárselo al gerente, que si no solo vería
// "falló" y no sabría si es un problema de credenciales, de monto o del pago.
function describeMpError(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { message?: unknown; cause?: unknown };
    const cause = Array.isArray(e.cause) ? (e.cause[0] as { description?: unknown } | undefined)?.description : undefined;
    const parts = [e.message, cause].filter((v): v is string => typeof v === "string" && v.length > 0);
    if (parts.length > 0) return [...new Set(parts)].join(" — ");
  }
  return "respuesta inesperada";
}

// Pide a Mercado Pago el reembolso total de los pagos aprobados del pedido. La
// llave de idempotencia hace seguro reintentar: la misma llamada no reembolsa
// dos veces. Mercado Pago acepta el reembolso, pero el abono al cliente no es
// inmediato (depende de su medio de pago y banco).
async function requestMercadoPagoRefund(orderId: string): Promise<RefundResult> {
  const admin = createAdminClient();
  const { data: payments } = await admin
    .from("payments")
    .select("mp_payment_id, amount")
    .eq("order_id", orderId)
    .eq("status", "approved");
  if (!payments || payments.length === 0) return { ok: false, reason: "no hay un pago aprobado registrado" };

  const refunds = new PaymentRefund(getMercadoPagoClient());
  let amount = 0;
  for (const payment of payments) {
    try {
      await refunds.total({
        payment_id: payment.mp_payment_id,
        requestOptions: { idempotencyKey: `refund-${orderId}-${payment.mp_payment_id}` },
      });
      amount += Number(payment.amount);
    } catch (err) {
      Sentry.captureException(err, { extra: { context: "mp-refund", orderId, paymentId: payment.mp_payment_id } });
      return { ok: false, reason: describeMpError(err) };
    }
  }
  return { ok: true, amount };
}

async function notifyCancellation(
  orderId: string,
  userId: string,
  refund: { state: "requested"; amount: number } | { state: "processing" } | null,
) {
  const email = await getUserEmail(userId);
  if (!email) return;
  const policy = refund?.state === "requested" ? refundPolicySentences(await getRefundPolicy()) : [];
  const { subject, html } = orderCancelledTemplate({
    orderLabel: await getOrderLabel(orderId),
    refund: refund?.state === "requested" ? { state: "requested", amount: refund.amount, policy } : refund,
  });
  await sendNotification({ userId, orderId, to: email, template: "order_cancelled", subject, html });
}

function revalidateOrders(orderId: string) {
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/retiros");
  revalidatePath("/admin");
  revalidatePath(`/pedido/${orderId}`);
}

// Cancela un pedido ya pagado (solo el gerente: involucra dinero) y, si se
// pide, solicita el reembolso a Mercado Pago. Devuelve cupón, puntos y cupo; el
// cupo diario de una campaña se libera solo porque se calcula sin los pedidos
// cancelados.
export async function cancelOrder(
  orderId: string,
  reasonKey: string,
  reasonNote: string,
  refund: boolean,
): Promise<CancelActionState> {
  const profile = await requireRole(["admin"]);

  const reasonLabel = CANCEL_REASONS[reasonKey];
  if (!reasonLabel) return { error: "Elige el motivo de la cancelación." };
  const note = reasonNote.trim().slice(0, 200);
  const reason = note ? `${reasonLabel}: ${note}` : reasonLabel;

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, user_id, status, total, order_number, payment_method, promotion_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.order_number == null) return { error: "Pedido no encontrado." };
  if (!CANCELABLE_STATUSES.includes(order.status)) {
    return { error: "Solo se puede cancelar un pedido pagado que todavía no se entregó." };
  }

  // Un pedido de campaña con retiros ya entregados necesitaría un reembolso
  // parcial, que esta pantalla no maneja todavía.
  const { count: deliveredParts } = await supabase
    .from("order_campaign_pickups")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId)
    .not("picked_up_at", "is", null);
  if ((deliveredParts ?? 0) > 0) {
    return { error: "Este pedido ya tiene retiros entregados: el reembolso parcial se gestiona fuera de la plataforma." };
  }

  const wantsRefund = refund && Number(order.total) > 0;
  if (wantsRefund && order.payment_method !== "mercadopago") {
    return { error: "Este pedido no se pagó por Mercado Pago: cancélalo sin reembolso automático." };
  }
  if (wantsRefund) {
    const { count: paymentCount } = await createAdminClient()
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("order_id", orderId)
      .eq("status", "approved");
    if ((paymentCount ?? 0) === 0) {
      return { error: "No hay un pago aprobado registrado para reembolsar. Cancélalo sin reembolso." };
    }
  }

  const nowIso = new Date().toISOString();
  const { data: claimed, error: cancelError } = await supabase
    .from("orders")
    .update({ status: "cancelled", cancelled_at: nowIso, cancelled_by: profile.id, cancel_reason: reason })
    .eq("id", orderId)
    .in("status", CANCELABLE_STATUSES)
    .select("id")
    .maybeSingle();
  if (cancelError || !claimed) return { error: "No se pudo cancelar el pedido. Revisa su estado e intenta de nuevo." };

  await supabase
    .from("order_status_history")
    .insert({ order_id: orderId, status: "cancelled", changed_by: profile.id, note: `Cancelado — ${reason}` });

  // Devoluciones de lo que el pedido había consumido. Si algo falla no se
  // deshace la cancelación (ya está hecha); queda en Sentry para corregirlo.
  try {
    await revertDraftConsumption({ id: order.id, user_id: order.user_id, promotion_id: order.promotion_id });
    await reverseLoyaltyPoints(order.id, order.user_id);
  } catch (err) {
    Sentry.captureException(err, { extra: { context: "cancel-order-revert", orderId } });
  }

  let refundState: { state: "requested"; amount: number } | { state: "processing" } | null = null;
  let refundFailureReason = "";
  const admin = createAdminClient();
  if (wantsRefund) {
    const result = await requestMercadoPagoRefund(orderId);
    if (result.ok) {
      await admin
        .from("orders")
        .update({ refund_status: "requested", refund_amount: result.amount, refund_requested_at: new Date().toISOString() })
        .eq("id", orderId);
      refundState = { state: "requested", amount: result.amount };
    } else {
      await admin.from("orders").update({ refund_status: "failed", refund_amount: Number(order.total) }).eq("id", orderId);
      refundState = { state: "processing" };
      refundFailureReason = result.reason;
    }
  }

  await logAction({
    actor: profile,
    action: "order_cancelled",
    entityType: "order",
    entityId: orderId,
    after: { reason, refund_requested: wantsRefund, refund_status: refundState?.state ?? null },
  });

  await notifyCancellation(orderId, order.user_id, refundState);
  revalidateOrders(orderId);

  if (refundState?.state === "requested") {
    return {
      success: `Pedido cancelado. Reembolso solicitado a Mercado Pago: el dinero no vuelve al instante, el cliente lo verá según su banco (${refundPolicySentences(await getRefundPolicy())[1]})`,
    };
  }
  if (refundState?.state === "processing") {
    return {
      success: `Pedido cancelado, pero Mercado Pago no aceptó el reembolso (${refundFailureReason}). Puedes reintentarlo desde el detalle del pedido.`,
    };
  }
  return { success: "Pedido cancelado sin reembolso automático." };
}

// Reintenta un reembolso que falló (ej. Mercado Pago no respondió).
export async function retryOrderRefund(orderId: string): Promise<CancelActionState> {
  const profile = await requireRole(["admin"]);
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, user_id, status, refund_status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.status !== "cancelled" || order.refund_status !== "failed") {
    return { error: "Este pedido no tiene un reembolso pendiente de reintento." };
  }

  const result = await requestMercadoPagoRefund(orderId);
  if (!result.ok) return { error: `Mercado Pago rechazó el reembolso: ${result.reason}.` };

  await createAdminClient()
    .from("orders")
    .update({ refund_status: "requested", refund_amount: result.amount, refund_requested_at: new Date().toISOString() })
    .eq("id", orderId);

  await logAction({
    actor: profile,
    action: "order_refund_requested",
    entityType: "order",
    entityId: orderId,
    after: { amount: result.amount },
  });
  await notifyCancellation(orderId, order.user_id, { state: "requested", amount: result.amount });
  revalidateOrders(orderId);
  return { success: "Reembolso solicitado a Mercado Pago." };
}

// Deja registrado un reembolso que el gerente hizo por fuera de la plataforma
// (desde el panel de Mercado Pago o una transferencia): sirve cuando la API
// rechaza el reembolso o cuando es parcial (pedido de campaña con retiros
// entregados). Solo registra: el dinero ya lo movió el gerente.
export async function markOrderRefundedManually(orderId: string): Promise<CancelActionState> {
  const profile = await requireRole(["admin"]);
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, user_id, status, total, refund_status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.status !== "cancelled" || order.refund_status !== "failed") {
    return { error: "Este pedido no tiene un reembolso pendiente de registrar." };
  }

  const nowIso = new Date().toISOString();
  const { data: updated, error } = await createAdminClient()
    .from("orders")
    .update({ refund_status: "requested", refund_requested_at: nowIso })
    .eq("id", orderId)
    .eq("refund_status", "failed")
    .select("id")
    .maybeSingle();
  if (error || !updated) return { error: "No se pudo registrar el reembolso." };

  await supabase.from("order_status_history").insert({
    order_id: orderId,
    status: "cancelled",
    changed_by: profile.id,
    note: "Reembolso gestionado manualmente fuera de la plataforma",
  });
  await logAction({
    actor: profile,
    action: "order_refund_marked_manual",
    entityType: "order",
    entityId: orderId,
    after: { amount: Number(order.total) },
  });
  await notifyCancellation(orderId, order.user_id, { state: "requested", amount: Number(order.total) });
  revalidateOrders(orderId);
  return { success: "Reembolso registrado como gestionado manualmente." };
}

// Los puntos ganados por la compra se descuentan y los canjeados por el
// producto se devuelven, con movimientos compensatorios (el ledger no se edita).
async function reverseLoyaltyPoints(orderId: string, userId: string) {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("points_ledger")
    .select("type, points")
    .eq("order_id", orderId)
    .in("type", ["earn_purchase", "redeem_product"]);

  const earned = (rows ?? []).filter((r) => r.type === "earn_purchase").reduce((sum, r) => sum + r.points, 0);
  const spent = (rows ?? []).filter((r) => r.type === "redeem_product").reduce((sum, r) => sum + Math.abs(r.points), 0);

  if (earned > 0) {
    await admin.from("points_ledger").insert({
      user_id: userId,
      order_id: orderId,
      type: "manual_adjustment",
      points: -earned,
      description: "Reversa de puntos: pedido cancelado",
    });
  }
  if (spent > 0) {
    await admin.from("points_ledger").insert({
      user_id: userId,
      order_id: orderId,
      type: "manual_adjustment",
      points: spent,
      description: "Devolución de puntos: pedido cancelado",
    });
  }
}
