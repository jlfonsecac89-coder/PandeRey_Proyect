import "server-only";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";

// El checkout crea el pedido en pending_payment ANTES de mandar al cliente a
// Mercado Pago (la pasarela necesita ese registro como external_reference), y
// ahí mismo consume el cupón, descuenta los puntos y reserva cupo de edición
// limitada. Si el cliente nunca paga, esos consumos quedaban colgados para
// siempre. Un borrador vencido se cancela y se revierte todo eso.
//
// 24 h y no minutos: el cron corre una vez al día y un medio de pago diferido
// de Mercado Pago podría confirmarse horas después; cancelar antes dejaría un
// pago aprobado sobre un pedido cancelado.
export const DRAFT_EXPIRY_HOURS = 24;

export async function cancelAbandonedDrafts(): Promise<number> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - DRAFT_EXPIRY_HOURS * 3600_000).toISOString();

  const { data: drafts } = await admin
    .from("orders")
    .select("id, user_id, promotion_id")
    .eq("status", "pending_payment")
    .eq("payment_method", "mercadopago")
    .is("order_number", null)
    .lt("created_at", cutoff)
    .limit(100);

  let cancelled = 0;
  for (const draft of drafts ?? []) {
    try {
      // Reclama el borrador de forma atómica: si otro proceso lo pagó o lo
      // canceló entre la consulta y acá, no devuelve fila y se salta.
      const { data: claimed } = await admin
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", draft.id)
        .eq("status", "pending_payment")
        .select("id")
        .maybeSingle();
      if (!claimed) continue;

      await admin.from("order_status_history").insert({
        order_id: draft.id,
        status: "cancelled",
        changed_by: null,
        note: "Pago no completado: borrador cancelado automáticamente",
      });

      await revertDraftConsumption(draft);
      cancelled += 1;
    } catch (err) {
      Sentry.captureException(err, { extra: { context: "cancel-abandoned-draft", orderId: draft.id } });
    }
  }
  return cancelled;
}

async function revertDraftConsumption(draft: { id: string; user_id: string; promotion_id: string | null }) {
  const admin = createAdminClient();

  // Cupón: libera el uso del cliente y el contador de la promoción.
  if (draft.promotion_id) {
    const { data: redemptions } = await admin
      .from("coupon_redemptions")
      .delete()
      .eq("order_id", draft.id)
      .select("id");
    if (redemptions && redemptions.length > 0) {
      const { data: promo } = await admin
        .from("promotions")
        .select("usage_count")
        .eq("id", draft.promotion_id)
        .maybeSingle();
      if (promo) {
        await admin
          .from("promotions")
          .update({ usage_count: Math.max(promo.usage_count - redemptions.length, 0) })
          .eq("id", draft.promotion_id);
      }
    }
  }

  // Puntos: se devuelve lo canjeado con un movimiento compensatorio (el
  // historial queda a la vista del cliente, no se borra nada del ledger).
  const { data: redeemed } = await admin
    .from("points_ledger")
    .select("points")
    .eq("order_id", draft.id)
    .eq("type", "redeem_discount");
  const pointsToReturn = (redeemed ?? []).reduce((sum, r) => sum + Math.abs(r.points), 0);
  if (pointsToReturn > 0) {
    await admin.from("points_ledger").insert({
      user_id: draft.user_id,
      order_id: draft.id,
      type: "manual_adjustment",
      points: pointsToReturn,
      description: "Devolución: la compra no se completó",
    });
  }

  // Cupo de edición limitada reservado al crear el pedido.
  const { data: items } = await admin
    .from("order_items")
    .select("product_id, quantity, product:products(is_special_event, special_orders_count)")
    .eq("order_id", draft.id);
  const perProduct = new Map<string, { quantity: number; count: number }>();
  for (const item of items ?? []) {
    const product = Array.isArray(item.product) ? item.product[0] : item.product;
    if (!product?.is_special_event) continue;
    const entry = perProduct.get(item.product_id) ?? { quantity: 0, count: product.special_orders_count };
    entry.quantity += item.quantity;
    perProduct.set(item.product_id, entry);
  }
  for (const [productId, { quantity, count }] of perProduct) {
    await admin
      .from("products")
      .update({ special_orders_count: Math.max(count - quantity, 0) })
      .eq("id", productId);
  }

  // Los lotes consumidos por el módulo de inventario no se restituyen acá: el
  // checkout no guarda qué lotes descontó. Con ese módulo apagado (el estado de
  // lanzamiento) no se consumen lotes, así que no hay nada que devolver.
}
