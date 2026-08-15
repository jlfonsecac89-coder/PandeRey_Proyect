"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/session";
import { generateDeliveryCode, orderPrepSlaMinutes } from "@/lib/orders/status";

export type RedeemProductState = { error?: string } | null;

// Canje de producto por puntos (sección 14) — solo retiro en tienda, para no
// mezclar "pagado en puntos" con el cálculo de envío en dinero. El pedido
// resultante entra al mismo pipeline que cualquier otro (SLA, notificaciones,
// panel de Operaciones) vía payment_method = 'points'.
export async function redeemProductForPoints(
  productId: string,
  storeId: string,
  _prev: RedeemProductState,
): Promise<RedeemProductState> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/login?next=/tienda");

  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("id, name, price, points_cost, is_active")
    .eq("id", productId)
    .maybeSingle();
  if (!product || !product.is_active || !product.points_cost) {
    return { error: "Este producto no está disponible para canje." };
  }

  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("id", storeId)
    .eq("is_active", true)
    .maybeSingle();
  if (!store) return { error: "Sucursal inválida." };

  // Aceptación 3 de la Fase 7 (misma regla que el descuento en checkout):
  // saldo insuficiente -> se rechaza sin tocar points_ledger ni crear pedido.
  const { data: freshProfile } = await supabase
    .from("profiles")
    .select("points_balance")
    .eq("id", profile.id)
    .single();
  if (!freshProfile || freshProfile.points_balance < product.points_cost) {
    return { error: "No tenés suficientes puntos para canjear este producto." };
  }

  const adminSupabase = createAdminClient();

  const { data: order, error: orderError } = await adminSupabase
    .from("orders")
    .insert({
      user_id: profile.id,
      delivery_method: "pickup",
      payment_method: "points",
      store_id: storeId,
      status: "preparing",
      sla_deadline: new Date(Date.now() + (await orderPrepSlaMinutes()) * 60000).toISOString(),
      delivery_confirmation_code: generateDeliveryCode(),
      subtotal: 0,
      discount_total: product.price,
      total: 0,
    })
    .select("id")
    .single();
  if (orderError || !order) return { error: "No se pudo generar el canje." };

  await adminSupabase.from("order_items").insert({
    order_id: order.id,
    product_id: product.id,
    product_name_snapshot: product.name,
    quantity: 1,
    unit_price: product.price,
    subtotal: product.price,
  });

  await adminSupabase.from("points_ledger").insert({
    user_id: profile.id,
    order_id: order.id,
    type: "redeem_product",
    points: -product.points_cost,
    description: `Canje de "${product.name}"`,
  });

  await adminSupabase.from("order_status_history").insert({
    order_id: order.id,
    status: "preparing",
    changed_by: profile.id,
    note: "Canje por puntos",
  });

  redirect(`/pedido/${order.id}`);
}
