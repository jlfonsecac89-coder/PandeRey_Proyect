"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/session";
import { geocodeStreetAddress } from "@/lib/geo/geocode";
import { METROPOLITANA_REGION_NAME, RM_COMUNAS } from "@/lib/geo/chile-regions";
import {
  formatBusinessHours,
  resolveSchedule,
  chileWallTimeToUtc,
  chileDateYmd,
  addDaysToYmd,
  weekdayFromYmd,
  slotsForDay,
  type BusinessHours,
  type DaySchedule,
} from "@/lib/stores/schedule";
import { computeShipping } from "./shipping";
import { createOrderPreference } from "@/lib/mercadopago/preference";
import { formatCLP } from "@/lib/format";
import { generateDeliveryCode } from "@/lib/orders/status";
import { validateCoupon, validatePointsRedemption } from "@/lib/promotions/discount";
import { checkRateLimit } from "@/lib/rate-limit/limiter";
import { getClearanceDiscounts, applyClearanceDiscount } from "@/lib/catalog/clearance";
import type { CartItem } from "@/lib/cart/types";

export type CheckoutState = { error?: string; success?: string; addressId?: string } | null;

// El SDK de Mercado Pago no tira un Error normal cuando la API responde con
// un status != 2xx — tira directamente el cuerpo JSON de la respuesta
// (`throw await response.json()`, ver mercadopago/dist/utils/restClient).
// Sentry.captureException igual lo captura, pero sin extraer estos campos a
// mano el mensaje real (`cause`/`message` de la API) queda enterrado.
function describeMpError(err: unknown): Record<string, unknown> {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    return { message: e.message, error: e.error, status: e.status, cause: e.cause };
  }
  return { raw: String(err) };
}

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

  const addressId = String(formData.get("address_id") || "").trim() || null;
  const label = String(formData.get("label") || "").trim() || null;
  const calle = String(formData.get("calle") || "").trim();
  const numero = String(formData.get("numero") || "").trim();
  const comuna = String(formData.get("comuna") || "").trim();
  // El despacho solo cubre la Región Metropolitana (Santiago es la única
  // ciudad de esa región relevante acá) — pedirle "ciudad" como texto libre
  // al cliente no aporta nada (nunca se usó para geocodificar) y sí puede
  // meter inconsistencias ("stgo", vacío, mal escrito), así que queda fija.
  const ciudad = "Santiago";
  const region = String(formData.get("region") || "").trim();
  const housingType = String(formData.get("housing_type") || "casa").trim();
  const deptoNumero = String(formData.get("depto_numero") || "").trim() || null;

  if (!calle || !numero || !comuna || !region) {
    return { error: "Completa calle, número, comuna y región." };
  }
  if (housingType !== "casa" && housingType !== "departamento") {
    return { error: "Tipo de vivienda inválido." };
  }
  if (housingType === "departamento" && !deptoNumero) {
    return { error: "Indicá el número de departamento." };
  }
  // Por ahora solo se despacha en la Región Metropolitana — el formulario ya
  // no deja elegir otra región/comuna, pero se revalida acá igual, nunca se
  // confía en lo que manda el cliente.
  if (region !== METROPOLITANA_REGION_NAME || !RM_COMUNAS.includes(comuna)) {
    return { error: "Por ahora solo hacemos despacho dentro de la Región Metropolitana." };
  }

  // Sección 16: 10 requests/min por usuario — evita abusar de la cuota
  // gratuita diaria de OpenRouteService.
  const { allowed } = await checkRateLimit("geocodificar", profile.id, 10, 60);
  if (!allowed) return { error: "Demasiados intentos. Esperá un minuto e intentá de nuevo." };

  let geocoded;
  try {
    geocoded = await geocodeStreetAddress({ calle, numero, comuna });
  } catch {
    return { error: "El servicio de geocodificación no está disponible ahora mismo." };
  }
  // Nunca se guarda una dirección sin coordenadas si va a usarse para despacho
  // (sección 07 del blueprint).
  if (!geocoded) {
    return { error: "No pudimos ubicar esa dirección en el mapa. Revisá que esté bien escrita." };
  }

  const supabase = await createClient();
  const addressPayload = {
    label,
    calle,
    numero,
    comuna,
    ciudad,
    region,
    housing_type: housingType,
    depto_numero: housingType === "departamento" ? deptoNumero : null,
    lat: geocoded.lat,
    lng: geocoded.lng,
    geocoded_at: new Date().toISOString(),
  };

  // address_id presente = se está editando una dirección existente en vez
  // de crear una nueva (Mis direcciones tiene botón "Editar", no solo
  // agregar) — el .eq("user_id", ...) es la única barrera contra que un
  // cliente edite la dirección de otro pasando un id ajeno.
  const { data: saved, error } = addressId
    ? await supabase
        .from("addresses")
        .update(addressPayload)
        .eq("id", addressId)
        .eq("user_id", profile.id)
        .select("id")
        .single()
    : await supabase
        .from("addresses")
        .insert({ user_id: profile.id, ...addressPayload })
        .select("id")
        .single();

  if (error || !saved) return { error: "No se pudo guardar la dirección." };

  revalidatePath("/checkout");
  revalidatePath("/cuenta/direcciones");
  return { success: addressId ? "Dirección actualizada." : "Dirección agregada.", addressId: saved.id };
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

// ---------- Días y horarios agendables (paso "Fecha y hora") ----------

export type ScheduleSlot = { time: string; iso: string; available: boolean; reason?: "full" };
export type ScheduleDayOption = { dateIso: string; label: string; slots: ScheduleSlot[] };

const DAY_LABEL_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  weekday: "short",
  day: "2-digit",
  month: "short",
});

// Se llama desde el paso "Fecha y hora" del checkout cada vez que cambia la
// sucursal, el método de entrega o el día elegido — arma hoy + 3 días
// siguientes (nunca más, sección "no puede agendar con 15 días de
// anticipación"), cada uno con sus slots de 15 min dentro del horario real
// de la sucursal (retiro o despacho, según corresponda) y marca como
// ocupados los que ya llegaron al tope de pedidos.
export async function getScheduleOptions(
  storeId: string,
  deliveryMethod: "pickup" | "shipping",
): Promise<ScheduleDayOption[]> {
  const profile = await getCurrentProfile();
  if (!profile) return [];

  const supabase = await createClient();
  const { data: store } = await supabase
    .from("stores")
    .select("id, business_hours, delivery_schedule, max_orders_per_slot")
    .eq("id", storeId)
    .eq("is_active", true)
    .maybeSingle();
  if (!store) return [];

  const resolvedSchedule = resolveSchedule(
    store.business_hours as BusinessHours,
    store.delivery_schedule as BusinessHours,
    deliveryMethod,
  );

  const now = new Date();
  const nowYmd = chileDateYmd(now);
  const days: { y: number; m: number; d: number; day: number; dateIso: string }[] = [];
  for (let offset = 0; offset <= 3; offset++) {
    const { y, m, d } = addDaysToYmd(nowYmd.y, nowYmd.m, nowYmd.d, offset);
    days.push({ y, m, d, day: weekdayFromYmd(y, m, d), dateIso: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` });
  }

  // Cuenta cuántos pedidos ya hay por slot en la ventana completa de una
  // sola consulta (en vez de una por slot) — con el cliente admin porque
  // customer_select_own_orders (RLS) no deja ver pedidos de otros clientes.
  const windowStart = chileWallTimeToUtc(days[0].y, days[0].m, days[0].d, 0, 0);
  const windowEnd = chileWallTimeToUtc(days[days.length - 1].y, days[days.length - 1].m, days[days.length - 1].d, 23, 59);
  const admin = createAdminClient();
  const { data: existingOrders } = await admin
    .from("orders")
    .select("scheduled_at")
    .eq("store_id", storeId)
    .neq("status", "cancelled")
    .gte("scheduled_at", windowStart.toISOString())
    .lte("scheduled_at", windowEnd.toISOString());
  const countBySlot = new Map<string, number>();
  for (const o of existingOrders ?? []) {
    if (!o.scheduled_at) continue;
    countBySlot.set(o.scheduled_at, (countBySlot.get(o.scheduled_at) ?? 0) + 1);
  }

  const options: ScheduleDayOption[] = [];
  for (const { y, m, d, day, dateIso } of days) {
    const dayEntry = resolvedSchedule?.find((h) => h.day === day) ?? null;
    const times = slotsForDay(dayEntry as DaySchedule | null);
    // Los horarios que ya pasaron ni se listan (no tiene sentido "elegir" un
    // horario de hace una hora) — a diferencia de un slot lleno, que sí se
    // muestra deshabilitado porque podría liberarse si alguien cancela.
    const slots: ScheduleSlot[] = times
      .map((time) => {
        const [hh, mm] = time.split(":").map(Number);
        const slotDate = chileWallTimeToUtc(y, m, d, hh, mm);
        const iso = slotDate.toISOString();
        const isPast = slotDate.getTime() <= now.getTime();
        const isFull = (countBySlot.get(iso) ?? 0) >= store.max_orders_per_slot;
        return { time, iso, isPast, available: !isPast && !isFull, reason: isFull ? ("full" as const) : undefined };
      })
      .filter((slot) => !slot.isPast)
      .map(({ isPast: _isPast, ...slot }) => slot);
    if (slots.length === 0) continue; // sucursal cerrada ese día, o ya no quedan horarios futuros
    options.push({ dateIso, label: DAY_LABEL_FORMATTER.format(slotDateForLabel(y, m, d)), slots });
  }
  return options;
}

export type CouponPreviewResult =
  | { ok: true; discountClp: number }
  | { ok: false; error: string }
  | null;

// Preview en vivo del cupón mientras el cliente lo escribe en el paso de
// pago — antes esto solo se validaba al confirmar el pedido, así que el
// cliente no tenía forma de saber si el código era válido (o cuánto
// descontaba) hasta después de pagar. Reusa exactamente la misma
// `validateCoupon` que la creación real del pedido, así que nunca puede
// mostrar un descuento que el cobro final no vaya a aplicar.
export async function previewCoupon(
  code: string,
  subtotal: number,
  cartItems: { productId: string; quantity: number; unitPrice: number }[],
): Promise<CouponPreviewResult> {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Iniciá sesión para usar un cupón." };

  const result = await validateCoupon({
    supabase: createAdminClient(),
    code: trimmed,
    userId: profile.id,
    subtotal,
    cartItems,
  });

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, discountClp: result.discountClp };
}

// Mediodía UTC del día en cuestión — solo para formatear la etiqueta del
// día (nombre + fecha), nunca se usa como hora real de ningún slot, así que
// alcanza con un instante cualquiera dentro de ese día calendario.
function slotDateForLabel(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d, 12, 0));
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
  const paymentMethodRaw = String(formData.get("payment_method") || "mercadopago");
  const paymentMethod = paymentMethodRaw === "bank_transfer" ? "bank_transfer" : "mercadopago";

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

  // Sección 13: si hay un lote en liquidación con stock para un producto en
  // esta sucursal, su precio de venta se recalcula acá — nunca se confía en
  // lo que haya mostrado la tienda al cliente, mismo principio que el resto
  // del checkout.
  const clearanceDiscounts = await getClearanceDiscounts(supabase, storeId, productIds);

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
    customization_note: string | null;
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

    let unitPrice = applyClearanceDiscount(product.price, clearanceDiscounts.get(product.id));
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
      customization_note: item.customizationNote?.trim() || null,
      options,
    });
  }

  const { data: store } = await supabase
    .from("stores")
    .select(
      "id, name, origin_lat, origin_lng, max_delivery_radius_km, min_order_amount, free_shipping_min_amount, social_links, business_hours, delivery_schedule, max_orders_per_slot",
    )
    .eq("id", storeId)
    .eq("is_active", true)
    .maybeSingle();
  if (!store) return { error: "Sucursal inválida." };

  if (paymentMethod === "bank_transfer" && !store.social_links?.whatsapp) {
    return { error: "Esta sucursal todavía no tiene WhatsApp configurado para pagos por transferencia." };
  }

  // La fecha/hora de retiro o despacho es obligatoria y debe caer dentro del
  // horario de atención de la sucursal (retiro y despacho pueden tener
  // horarios distintos), alineada a un slot de 15 minutos, dentro de la
  // ventana de agendamiento (hoy + 3 días) y sin superar el cupo de pedidos
  // de ese horario — nunca se confía en lo que eligió el cliente en la
  // grilla, se recalcula todo acá con los mismos datos que armó esa grilla.
  const resolvedSchedule = resolveSchedule(
    store.business_hours as BusinessHours,
    store.delivery_schedule as BusinessHours,
    deliveryMethod,
  );
  if (!scheduledAtRaw) return { error: "Elegí una fecha y hora de retiro o despacho." };
  const scheduledAtDate = new Date(scheduledAtRaw);
  if (Number.isNaN(scheduledAtDate.getTime())) return { error: "Fecha/hora programada inválida." };
  if (scheduledAtDate.getTime() < Date.now()) return { error: "Elegí una fecha y hora futura." };

  const nowYmd = chileDateYmd(new Date());
  const maxYmd = addDaysToYmd(nowYmd.y, nowYmd.m, nowYmd.d, 3);
  const maxScheduledAt = chileWallTimeToUtc(maxYmd.y, maxYmd.m, maxYmd.d, 23, 59);
  if (scheduledAtDate.getTime() > maxScheduledAt.getTime()) {
    return { error: "Solo se puede agendar hasta 3 días desde hoy." };
  }

  const scheduledYmd = chileDateYmd(scheduledAtDate);
  const dayEntry = resolvedSchedule?.find((h) => h.day === scheduledYmd.day) ?? null;
  const daySlots = slotsForDay(dayEntry as DaySchedule | null);
  const scheduledHhmm = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(scheduledAtDate);
  if (!daySlots.includes(scheduledHhmm)) {
    return {
      error: `Ese horario está fuera del horario de ${deliveryMethod === "pickup" ? "retiro" : "despacho"} de la sucursal (${formatBusinessHours(resolvedSchedule)}).`,
    };
  }

  // Cupo por horario (sección "no saturar al equipo") — se cuenta con el
  // cliente admin porque customer_select_own_orders (RLS) no deja ver
  // pedidos de otros clientes, y acá hace falta el total real del slot.
  const adminForSlotCheck = createAdminClient();
  const { count: slotCount } = await adminForSlotCheck
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("scheduled_at", scheduledAtDate.toISOString())
    .neq("status", "cancelled");
  if ((slotCount ?? 0) >= store.max_orders_per_slot) {
    return { error: "Ese horario ya está completo. Elegí otro horario cercano." };
  }

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

  const scheduledAtIso = scheduledAtDate.toISOString();

  // Aceptación 2 de la Fase 3 (nunca conectada al checkout real hasta esta
  // pasada de hardening, Fase 9): un producto is_special_event no puede
  // vender más de max_orders unidades, ni con compras concurrentes. Va acá,
  // como el último paso antes de crear el pedido — recién cuando ya pasaron
  // todas las demás validaciones (sucursal, envío, cupón, puntos) para no
  // reservar cupo de un intento que de todas formas iba a fallar por otra
  // razón. Suma por product_id porque el mismo producto puede aparecer en
  // más de un ítem del carrito (variantes distintas).
  const specialEventQuantities = new Map<string, number>();
  const productQuantities = new Map<string, number>();
  for (const item of orderItemsToInsert) {
    const product = productMap.get(item.product_id);
    if (product?.is_special_event) {
      specialEventQuantities.set(
        item.product_id,
        (specialEventQuantities.get(item.product_id) ?? 0) + item.quantity,
      );
    }
    productQuantities.set(item.product_id, (productQuantities.get(item.product_id) ?? 0) + item.quantity);
  }

  const reservedProductIds: string[] = [];
  const consumedBatches: { productId: string; consumed: unknown }[] = [];
  async function releaseReservedStock() {
    for (const doneId of reservedProductIds) {
      await supabase.rpc("release_special_event_stock", {
        p_product_id: doneId,
        p_quantity: specialEventQuantities.get(doneId)!,
      });
    }
    for (const entry of consumedBatches) {
      await supabase.rpc("restore_batch_stock", { p_consumed: entry.consumed });
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

  // Sección 13: consumo real de stock, FIFO por vencimiento. Solo se exige
  // para productos que efectivamente tienen lotes cargados en esta sucursal
  // — un producto sin ningún lote se trata como no trackeado por lotes
  // (ver comentario de diseño en la migración 20260808000100).
  for (const [productId, quantity] of productQuantities) {
    const { data: tracked } = await supabase.rpc("has_tracked_batches", {
      p_store_id: store.id,
      p_product_id: productId,
    });
    if (!tracked) continue;

    const { data: consumed } = await supabase.rpc("consume_batch_stock_fifo", {
      p_store_id: store.id,
      p_product_id: productId,
      p_quantity: quantity,
    });
    if (!consumed) {
      await releaseReservedStock();
      const productName = productMap.get(productId)?.name ?? "un producto";
      return { error: `"${productName}" no tiene stock suficiente.` };
    }
    consumedBatches.push({ productId, consumed });
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: profile.id,
      delivery_method: deliveryMethod,
      payment_method: paymentMethod,
      store_id: store.id,
      address_id: deliveryMethod === "shipping" ? address!.id : null,
      scheduled_at: scheduledAtIso,
      delivery_distance_km: quote.distanceKm,
      delivery_confirmation_code: generateDeliveryCode(),
      subtotal,
      discount_total: discountTotal,
      coupon_discount_clp: couponDiscount,
      points_discount_clp: pointsDiscount,
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
        customization_note: i.customization_note,
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

  // Transferencia: no hay pasarela — el pedido queda "pending_payment" hasta
  // que el equipo confirme el depósito a mano (confirmBankTransferPayment,
  // lib/orders/actions.ts) y al cliente se lo manda directo a WhatsApp con
  // el pedido y el monto ya escritos, para que no tenga que explicarlo de cero.
  if (paymentMethod === "bank_transfer") {
    const whatsappBase = store.social_links!.whatsapp as string;
    const message = `Hola! Quiero pagar por transferencia mi pedido #${order.id.slice(0, 8).toUpperCase()} por ${formatCLP(total)}.`;
    const separator = whatsappBase.includes("?") ? "&" : "?";
    redirect(`${whatsappBase}${separator}text=${encodeURIComponent(message)}`);
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
  } catch (err) {
    // Antes esto se tragaba el error real y solo quedaba el mensaje
    // genérico — sin poder saber en Sentry/logs si fue un token inválido,
    // un ítem rechazado por la API de MP, etc.
    Sentry.captureException(err, { extra: { orderId: order.id, mpError: describeMpError(err) } });
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
  } catch (err) {
    Sentry.captureException(err, { extra: { orderId, mpError: describeMpError(err) } });
    return { error: "No se pudo iniciar el pago con Mercado Pago." };
  }

  const redirectUrl = preferenceResult.init_point || preferenceResult.sandbox_init_point;
  if (!redirectUrl) return { error: "Mercado Pago no devolvió una URL de pago." };

  redirect(redirectUrl);
}
