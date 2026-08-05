"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/session";
import { geocodeAddress } from "@/lib/geo/geocode";
import { computeShipping } from "./shipping";
import { createOrderPreference } from "@/lib/mercadopago/preference";
import { formatCLP } from "@/lib/format";
import { generateDeliveryCode } from "@/lib/orders/status";
import { validateCoupon, validatePointsRedemption } from "@/lib/promotions/discount";
import { checkRateLimit } from "@/lib/rate-limit/limiter";
import type { CartItem } from "@/lib/cart/types";

export type CheckoutState = { error?: string; success?: string; addressId?: string } | null;

export type ShippingPreviewState =
  | { error: string }
  | { ok: true; distanceKm: number | null; shippingCost: number }
  | null;

// ---------- Direcciones ----------

export async function saveAddress(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/login?next=/checkout");

  const label = String(formData.get("label") || "").trim() || null;
  const calle = String(formData.get("calle") || "").trim();
  const numero = String(formData.get("numero") || "").trim();
  const comuna = String(formData.get("comuna") || "").trim();
  const ciudad = String(formData.get("ciudad") || "").trim();
  const region = String(formData.get("region") || "").trim();
  const codigoPostal = String(formData.get("codigo_postal") || "").trim() || null;

  if (!calle || !numero || !comuna || !ciudad || !region) {
    return { error: "Completa calle, número, comuna, ciudad y región." };
  }

  // Sección 16: 10 requests/min por usuario — evita abusar de la cuota
  // gratuita diaria de OpenRouteService.
  const { allowed } = await checkRateLimit("geocodificar", profile.id, 10, 60);
  if (!allowed) return { error: "Demasiados intentos. Esperá un minuto e intentá de nuevo." };

  // OpenRouteService/Pelias geocodifica mucho mejor a nivel de número exacto
  // con "calle número, comuna, Chile" — agregar ciudad/región duplica la
  // comuna en la mayoría de las direcciones chilenas y degrada el match a
  // nivel de calle en vez de punto exacto (confirmado empíricamente).
  const fullAddressText = `${calle} ${numero}, ${comuna}, Chile`;

  let geocoded;
  try {
    geocoded = await geocodeAddress(fullAddressText);
  } catch {
    return { error: "El servicio de geocodificación no está disponible ahora mismo." };
  }
  // Nunca se guarda una dirección sin coordenadas si va a usarse para despacho
  // (sección 07 del blueprint).
  if (!geocoded) {
    return { error: "No pudimos ubicar esa dirección en el mapa. Revisá que esté bien escrita." };
  }

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("addresses")
    .insert({
      user_id: profile.id,
      label,
      calle,
      numero,
      comuna,
      ciudad,
      region,
      codigo_postal: codigoPostal,
      lat: geocoded.lat,
      lng: geocoded.lng,
      geocoded_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !created) return { error: "No se pudo guardar la dirección." };

  revalidatePath("/checkout");
  return { success: "Dirección agregada.", addressId: created.id };
}

// ---------- Previsualización de envío ----------

export async function previewShipping(
  _prev: ShippingPreviewState,
  formData: FormData,
): Promise<ShippingPreviewState> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/login?next=/checkout");

  const storeId = String(formData.get("store_id") || "");
  const deliveryMethod = String(formData.get("delivery_method") || "");
  const addressId = String(formData.get("address_id") || "") || null;
  const subtotal = Number(formData.get("subtotal") || "0");

  if (!storeId) return { error: "Elegí una sucursal." };
  if (deliveryMethod !== "pickup" && deliveryMethod !== "shipping") {
    return { error: "Elegí un método de entrega." };
  }

  const supabase = await createClient();
  const { data: store } = await supabase
    .from("stores")
    .select("id, origin_lat, origin_lng, max_delivery_radius_km, min_order_amount, free_shipping_min_amount")
    .eq("id", storeId)
    .eq("is_active", true)
    .maybeSingle();
  if (!store) return { error: "Sucursal inválida." };

  if (store.min_order_amount !== null && subtotal < store.min_order_amount) {
    return { error: `El pedido mínimo para esta sucursal es ${formatCLP(store.min_order_amount)}.` };
  }

  let address: { lat: number | null; lng: number | null } | null = null;
  if (deliveryMethod === "shipping") {
    if (!addressId) return { error: "Elegí una dirección de despacho." };
    const { data: addr } = await supabase
      .from("addresses")
      .select("lat, lng")
      .eq("id", addressId)
      .eq("user_id", profile.id)
      .maybeSingle();
    if (!addr) return { error: "Dirección inválida." };
    address = addr;
  }

  const quote = await computeShipping({ supabase, store, deliveryMethod, address, subtotal });
  if (!quote.ok) return { error: quote.error };

  return { ok: true, distanceKm: quote.distanceKm, shippingCost: quote.shippingCost };
}

// ---------- Creación del pedido + preferencia de Mercado Pago ----------

export async function createCheckoutPreference(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/login?next=/checkout");

  // Sección 16: 20 requests/min por usuario autenticado.
  const { allowed } = await checkRateLimit("checkout", profile.id, 20, 60);
  if (!allowed) return { error: "Demasiados intentos de pago. Esperá un minuto e intentá de nuevo." };

  const cartItemsRaw = String(formData.get("cart_items") || "[]");
  const deliveryMethod = String(formData.get("delivery_method") || "");
  const storeId = String(formData.get("store_id") || "");
  const addressId = String(formData.get("address_id") || "") || null;
  const scheduledAtRaw = String(formData.get("scheduled_at") || "") || null;

  if (deliveryMethod !== "pickup" && deliveryMethod !== "shipping") {
    return { error: "Elegí un método de entrega." };
  }
  if (!storeId) return { error: "Elegí una sucursal." };
  if (deliveryMethod === "shipping" && !addressId) {
    return { error: "Elegí o agregá una dirección de despacho." };
  }

  let cartItems: CartItem[];
  try {
    cartItems = JSON.parse(cartItemsRaw);
  } catch {
    return { error: "Carrito inválido." };
  }
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return { error: "Tu carrito está vacío." };
  }

  const supabase = await createClient();

  // --- Recalcular todo server-side: nunca se confía en precios que manda el cliente ---
  const productIds = [...new Set(cartItems.map((i) => i.productId))];
  const { data: dbProducts } = await supabase
    .from("products")
    .select("id, name, price, is_active, is_special_event")
    .in("id", productIds);
  const productMap = new Map((dbProducts ?? []).map((p) => [p.id, p]));

  const optionValueIds = [...new Set(cartItems.flatMap((i) => i.options.map((o) => o.optionValueId)))];
  const { data: dbOptionValues } = optionValueIds.length
    ? await supabase.from("product_option_values").select("id, name, price_delta, is_active").in("id", optionValueIds)
    : { data: [] as { id: string; name: string; price_delta: number; is_active: boolean }[] };
  const optionValueMap = new Map((dbOptionValues ?? []).map((v) => [v.id, v]));

  let subtotal = 0;
  const orderItemsToInsert: {
    product_id: string;
    product_name_snapshot: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    options: {
      option_group_name_snapshot: string;
      option_value_name_snapshot: string;
      price_delta_snapshot: number;
    }[];
  }[] = [];

  for (const item of cartItems) {
    const product = productMap.get(item.productId);
    if (!product || !product.is_active) {
      return { error: `"${item.name}" ya no está disponible.` };
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return { error: "Cantidad inválida en el carrito." };
    }

    let unitPrice = product.price;
    const options: (typeof orderItemsToInsert)[number]["options"] = [];
    for (const opt of item.options) {
      const value = optionValueMap.get(opt.optionValueId);
      if (!value || !value.is_active) {
        return { error: `Una opción de "${product.name}" ya no está disponible.` };
      }
      unitPrice += value.price_delta;
      options.push({
        option_group_name_snapshot: opt.optionGroupName,
        option_value_name_snapshot: value.name,
        price_delta_snapshot: value.price_delta,
      });
    }

    const itemSubtotal = unitPrice * item.quantity;
    subtotal += itemSubtotal;

    orderItemsToInsert.push({
      product_id: product.id,
      product_name_snapshot: product.name,
      quantity: item.quantity,
      unit_price: unitPrice,
      subtotal: itemSubtotal,
      options,
    });
  }

  const { data: store } = await supabase
    .from("stores")
    .select("id, name, origin_lat, origin_lng, max_delivery_radius_km, min_order_amount, free_shipping_min_amount")
    .eq("id", storeId)
    .eq("is_active", true)
    .maybeSingle();
  if (!store) return { error: "Sucursal inválida." };

  // Aceptación 4: mínimo de compra.
  if (store.min_order_amount !== null && subtotal < store.min_order_amount) {
    return { error: `El pedido mínimo para esta sucursal es ${formatCLP(store.min_order_amount)}.` };
  }

  let address: { id: string; lat: number | null; lng: number | null } | null = null;
  if (deliveryMethod === "shipping") {
    const { data: addr } = await supabase
      .from("addresses")
      .select("id, lat, lng")
      .eq("id", addressId!)
      .eq("user_id", profile.id)
      .maybeSingle();
    if (!addr) return { error: "Dirección inválida." };
    address = addr;
  }

  // Aceptación 2/3: radio de entrega y tramo de envío — recalculado acá,
  // nunca se confía en lo que haya mostrado el preview del cliente.
  const quote = await computeShipping({ supabase, store, deliveryMethod, address, subtotal });
  if (!quote.ok) return { error: quote.error };

  const totalBeforeDiscounts = subtotal + quote.shippingCost;

  // --- Cupón (opcional) ---
  const couponCode = String(formData.get("coupon_code") || "").trim();
  let promotionId: string | null = null;
  let couponDiscount = 0;
  if (couponCode) {
    // `promotions` solo tiene policy pública de lectura para promociones SIN
    // código (automáticas) — un cupón con código es intencionalmente
    // invisible para la sesión del cliente, así no se pueden enumerar
    // códigos válidos con una consulta directa a la tabla (comentario
    // original en la migración de promotions). La validación se hace acá
    // con el cliente admin, precisamente para eso.
    const couponResult = await validateCoupon({
      supabase: createAdminClient(),
      code: couponCode,
      userId: profile.id,
      subtotal,
      cartItems: orderItemsToInsert.map((i) => ({
        productId: i.product_id,
        quantity: i.quantity,
        unitPrice: i.unit_price,
      })),
    });
    if (!couponResult.ok) return { error: couponResult.error };
    promotionId = couponResult.promotionId;
    couponDiscount = couponResult.discountClp;
  }

  // --- Canje de puntos por descuento (opcional) — Aceptación 3 de la Fase 7 ---
  const pointsToRedeemRaw = String(formData.get("points_to_redeem") || "0");
  const pointsToRedeem = Number(pointsToRedeemRaw) || 0;
  let pointsDiscount = 0;
  if (pointsToRedeem > 0) {
    const pointsResult = await validatePointsRedemption({
      supabase,
      userId: profile.id,
      pointsToRedeem,
      maxDiscountAllowed: totalBeforeDiscounts - couponDiscount,
    });
    if (!pointsResult.ok) return { error: pointsResult.error };
    pointsDiscount = pointsResult.discountClp;
  }

  const discountTotal = couponDiscount + pointsDiscount;
  const total = totalBeforeDiscounts - discountTotal;
  if (total <= 0) {
    return { error: "El descuento aplicado supera el total del pedido — reducí el cupón o los puntos usados." };
  }

  let scheduledAtIso: string | null = null;
  if (scheduledAtRaw) {
    const parsed = new Date(scheduledAtRaw);
    if (Number.isNaN(parsed.getTime())) return { error: "Fecha/hora programada inválida." };
    scheduledAtIso = parsed.toISOString();
  }

  // Aceptación 2 de la Fase 3 (nunca conectada al checkout real hasta esta
  // pasada de hardening, Fase 9): un producto is_special_event no puede
  // vender más de max_orders unidades, ni con compras concurrentes. Va acá,
  // como el último paso antes de crear el pedido — recién cuando ya pasaron
  // todas las demás validaciones (sucursal, envío, cupón, puntos) para no
  // reservar cupo de un intento que de todas formas iba a fallar por otra
  // razón. Suma por product_id porque el mismo producto puede aparecer en
  // más de un ítem del carrito (variantes distintas).
  const specialEventQuantities = new Map<string, number>();
  for (const item of orderItemsToInsert) {
    const product = productMap.get(item.product_id);
    if (product?.is_special_event) {
      specialEventQuantities.set(
        item.product_id,
        (specialEventQuantities.get(item.product_id) ?? 0) + item.quantity,
      );
    }
  }

  const reservedProductIds: string[] = [];
  async function releaseReservedStock() {
    for (const doneId of reservedProductIds) {
      await supabase.rpc("release_special_event_stock", {
        p_product_id: doneId,
        p_quantity: specialEventQuantities.get(doneId)!,
      });
    }
  }

  for (const [productId, quantity] of specialEventQuantities) {
    const { data: reserved } = await supabase.rpc("reserve_special_event_stock", {
      p_product_id: productId,
      p_quantity: quantity,
    });
    if (!reserved) {
      await releaseReservedStock();
      const productName = productMap.get(productId)?.name ?? "un producto de edición limitada";
      return { error: `"${productName}" ya no tiene cupo disponible.` };
    }
    reservedProductIds.push(productId);
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: profile.id,
      delivery_method: deliveryMethod,
      payment_method: "mercadopago",
      store_id: store.id,
      address_id: deliveryMethod === "shipping" ? address!.id : null,
      scheduled_at: scheduledAtIso,
      delivery_distance_km: quote.distanceKm,
      delivery_confirmation_code: generateDeliveryCode(),
      subtotal,
      discount_total: discountTotal,
      promotion_id: promotionId,
      total,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    await releaseReservedStock();
    return { error: "No se pudo crear el pedido." };
  }

  // El descuento ya se validó arriba (cupón vigente, saldo de puntos
  // suficiente) — acá solo se registra el consumo, atómico con la creación
  // del pedido en la medida de lo posible (sección 14: "nunca se descuenta
  // el saldo sin que quede el registro correspondiente en el ledger").
  if (promotionId) {
    await supabase.from("coupon_redemptions").insert({
      promotion_id: promotionId,
      user_id: profile.id,
      order_id: order.id,
    });
    // `promotions` no tiene policy de UPDATE para customer (solo
    // staff_manage_promotions) — el contador de usos es bookkeeping del
    // propio checkout, se escribe con el cliente admin.
    const adminForUsage = createAdminClient();
    const { data: currentPromo } = await adminForUsage
      .from("promotions")
      .select("usage_count")
      .eq("id", promotionId)
      .single();
    if (currentPromo) {
      await adminForUsage
        .from("promotions")
        .update({ usage_count: currentPromo.usage_count + 1 })
        .eq("id", promotionId);
    }
  }
  if (pointsToRedeem > 0) {
    const adminSupabaseForPoints = createAdminClient();
    await adminSupabaseForPoints.from("points_ledger").insert({
      user_id: profile.id,
      order_id: order.id,
      type: "redeem_discount",
      points: -pointsToRedeem,
      description: `Descuento aplicado en pedido #${order.id.slice(0, 8)}`,
    });
  }

  // INSERT multi-fila con RETURNING preserva el orden de los VALUES en Postgres
  // (sin ORDER BY ni agregación de por medio) — se usa ese orden para asociar
  // cada order_item recién creado con sus opciones snapshot.
  const { data: insertedItems, error: itemsError } = await supabase
    .from("order_items")
    .insert(
      orderItemsToInsert.map((i) => ({
        order_id: order.id,
        product_id: i.product_id,
        product_name_snapshot: i.product_name_snapshot,
        quantity: i.quantity,
        unit_price: i.unit_price,
        subtotal: i.subtotal,
      })),
    )
    .select("id");

  if (itemsError || !insertedItems || insertedItems.length !== orderItemsToInsert.length) {
    return { error: "No se pudieron guardar los ítems del pedido." };
  }

  const optionsToInsert = insertedItems.flatMap((inserted, idx) =>
    orderItemsToInsert[idx].options.map((o) => ({
      order_item_id: inserted.id,
      option_group_name_snapshot: o.option_group_name_snapshot,
      option_value_name_snapshot: o.option_value_name_snapshot,
      price_delta_snapshot: o.price_delta_snapshot,
    })),
  );
  if (optionsToInsert.length > 0) {
    await supabase.from("order_item_options").insert(optionsToInsert);
  }

  let preferenceResult;
  try {
    preferenceResult = await createOrderPreference({
      orderId: order.id,
      items: orderItemsToInsert.map((i) => ({
        id: i.product_id,
        title: i.product_name_snapshot,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
      shippingCost: quote.shippingCost,
      discountTotal,
    });
  } catch {
    return { error: "No se pudo iniciar el pago con Mercado Pago." };
  }

  // Para cuentas de vendedor de prueba (test user), el checkout que
  // realmente funciona es el de Checkout Pro "de producción" (init_point) —
  // el subdominio legacy sandbox.mercadopago.cl falla al procesar el pago en
  // este tipo de cuentas. La transacción igual queda contenida dentro del
  // ecosistema de test users (comprador y vendedor de prueba), no mueve
  // dinero real.
  const redirectUrl = preferenceResult.init_point || preferenceResult.sandbox_init_point;
  if (!redirectUrl) return { error: "Mercado Pago no devolvió una URL de pago." };

  // `orders` no tiene policy de UPDATE para customer (sección 10 del
  // blueprint: el cliente solo puede crear/leer sus pedidos, nunca
  // modificarlos) — este campo es bookkeeping del propio checkout, no una
  // edición del cliente, así que se escribe con el cliente admin.
  const adminSupabase = createAdminClient();
  await adminSupabase
    .from("orders")
    .update({ mp_preference_id: preferenceResult.id })
    .eq("id", order.id);

  redirect(redirectUrl);
}

// ---------- Reenvío pagado tras devolución a tienda ----------

// Cuando un pedido vuelve a la tienda (`returned_to_store`, sección 07), el
// cliente puede pagar el envío de nuevo para que se reintente — cobra el
// mismo costo de envío que ya se había calculado para el pedido original
// (total - subtotal), sin recalcular distancia/tramo de nuevo.
export async function payResendShipping(orderId: string): Promise<CheckoutState> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/login?next=/pedido/" + orderId);

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, user_id, status, subtotal, total")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.user_id !== profile.id) return { error: "Pedido no encontrado." };
  if (order.status !== "returned_to_store") {
    return { error: "Este pedido no está disponible para reenvío." };
  }

  const extraShippingCost = order.total - order.subtotal;
  if (extraShippingCost <= 0) return { error: "No hay costo de envío para cobrar." };

  let preferenceResult;
  try {
    preferenceResult = await createOrderPreference({
      orderId: `${orderId}${":resend"}`,
      items: [{ id: "reenvio", title: "Reenvío de pedido", quantity: 1, unit_price: extraShippingCost }],
      shippingCost: 0,
    });
  } catch {
    return { error: "No se pudo iniciar el pago con Mercado Pago." };
  }

  const redirectUrl = preferenceResult.init_point || preferenceResult.sandbox_init_point;
  if (!redirectUrl) return { error: "Mercado Pago no devolvió una URL de pago." };

  redirect(redirectUrl);
}
