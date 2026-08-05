import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { computePointsDiscountClp } from "@/lib/loyalty/points";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type CouponResult =
  | { ok: true; promotionId: string; discountClp: number }
  | { ok: false; error: string };

// Cupón validado con la misma lógica que el canje de puntos (sección 14): se
// revalida todo server-side, nunca se confía en un preview del cliente.
export async function validateCoupon(params: {
  supabase: SupabaseClient;
  code: string;
  userId: string;
  subtotal: number;
  cartItems: { productId: string; quantity: number; unitPrice: number }[];
}): Promise<CouponResult> {
  const { supabase, code, userId, subtotal, cartItems } = params;

  const { data: promo } = await supabase
    .from("promotions")
    .select(
      "id, type, value, max_discount_amount, department_id, category_id, product_id, min_order_amount, single_use_per_customer, max_uses, usage_count, starts_at, ends_at, is_active",
    )
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();

  if (!promo || !promo.is_active) return { ok: false, error: "Cupón inválido." };

  const now = new Date();
  if (now < new Date(promo.starts_at) || now > new Date(promo.ends_at)) {
    return { ok: false, error: "Este cupón no está vigente." };
  }
  if (promo.max_uses !== null && promo.usage_count >= promo.max_uses) {
    return { ok: false, error: "Este cupón ya alcanzó su límite de usos." };
  }
  if (subtotal < (promo.min_order_amount ?? 0)) {
    return { ok: false, error: "Tu carrito no alcanza el mínimo de compra de este cupón." };
  }
  if (promo.single_use_per_customer) {
    const { data: existingRedemption } = await supabase
      .from("coupon_redemptions")
      .select("id")
      .eq("promotion_id", promo.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (existingRedemption) return { ok: false, error: "Ya usaste este cupón antes." };
  }

  // Alcance del cupón: producto/categoría/departamento específico, o todo el
  // carrito si no tiene ninguno de los tres set.
  let eligibleSubtotal = subtotal;
  if (promo.product_id || promo.category_id || promo.department_id) {
    const productIds = [...new Set(cartItems.map((i) => i.productId))];
    const { data: products } = await supabase
      .from("products")
      .select("id, category_id")
      .in("id", productIds);
    const categoryIds = [...new Set((products ?? []).map((p) => p.category_id))];
    const { data: categories } = categoryIds.length
      ? await supabase.from("categories").select("id, department_id").in("id", categoryIds)
      : { data: [] as { id: string; department_id: string }[] };

    const productToCategory = new Map((products ?? []).map((p) => [p.id, p.category_id]));
    const categoryToDept = new Map((categories ?? []).map((c) => [c.id, c.department_id]));

    eligibleSubtotal = cartItems.reduce((sum, item) => {
      const catId = productToCategory.get(item.productId);
      const deptId = catId ? categoryToDept.get(catId) : undefined;
      const matches = promo.product_id
        ? item.productId === promo.product_id
        : promo.category_id
          ? catId === promo.category_id
          : deptId === promo.department_id;
      return matches ? sum + item.unitPrice * item.quantity : sum;
    }, 0);

    if (eligibleSubtotal <= 0) {
      return { ok: false, error: "Este cupón no aplica a los productos de tu carrito." };
    }
  }

  let discount = promo.type === "percentage" ? eligibleSubtotal * (promo.value / 100) : promo.value;
  if (promo.max_discount_amount !== null) discount = Math.min(discount, promo.max_discount_amount);
  discount = Math.min(discount, eligibleSubtotal);

  return { ok: true, promotionId: promo.id, discountClp: Math.floor(discount) };
}

export type PointsRedemptionResult =
  | { ok: true; discountClp: number }
  | { ok: false; error: string };

// Aceptación 3 de la Fase 7: si el cliente pide canjear más puntos de los
// que tiene, se rechaza sin tocar points_ledger ni el pedido — esta función
// solo valida y calcula, no escribe nada.
export async function validatePointsRedemption(params: {
  supabase: SupabaseClient;
  userId: string;
  pointsToRedeem: number;
  maxDiscountAllowed: number;
}): Promise<PointsRedemptionResult> {
  const { supabase, userId, pointsToRedeem, maxDiscountAllowed } = params;
  if (pointsToRedeem <= 0) return { ok: true, discountClp: 0 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("points_balance")
    .eq("id", userId)
    .single();

  if (!profile || pointsToRedeem > profile.points_balance) {
    return { ok: false, error: "No tenés suficientes puntos disponibles." };
  }

  const discountClp = computePointsDiscountClp(pointsToRedeem);
  if (discountClp >= maxDiscountAllowed) {
    return {
      ok: false,
      error: "Esa cantidad de puntos cubre más de lo que podés canjear en este pedido — usá menos puntos.",
    };
  }

  return { ok: true, discountClp };
}
