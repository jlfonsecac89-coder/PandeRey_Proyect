import "server-only";
import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Sección 13 del blueprint: "el descuento aplica solo a las unidades de ese
// lote" — como el consumo real es FIFO (el lote más próximo a vencer se
// vende primero), mientras exista un lote en liquidación con stock > 0 para
// ese producto en esa sucursal, las próximas unidades vendidas SÍ salen de
// ese lote. Si hay más de un lote en liquidación a la vez, se usa el mayor
// descuento (el más urgente de vender).
//
// `product_batches` no tiene policy de SELECT pública a propósito (es dato
// operativo interno — cantidad, vencimiento, quién lo cargó) — por eso esto
// pasa por la función SECURITY DEFINER get_clearance_discounts, que solo
// expone el porcentaje agregado, nunca la fila completa del lote.
export async function getClearanceDiscounts(
  supabase: SupabaseClient,
  storeId: string,
  productIds: string[],
): Promise<Map<string, number>> {
  const discounts = new Map<string, number>();
  if (productIds.length === 0 || !storeId) return discounts;

  const { data } = await supabase.rpc("get_clearance_discounts", {
    p_store_id: storeId,
    p_product_ids: productIds,
  });

  for (const row of data ?? []) {
    discounts.set(row.product_id, Number(row.discount_percent));
  }

  return discounts;
}

export async function getClearanceProductIds(supabase: SupabaseClient, storeId: string | null): Promise<Set<string>> {
  if (!storeId) return new Set();
  const { data } = await supabase.rpc("get_clearance_product_ids", { p_store_id: storeId });
  return new Set(data ?? []);
}

export function applyClearanceDiscount(basePrice: number, discountPercent: number | undefined): number {
  if (!discountPercent) return basePrice;
  return Math.round(basePrice * (1 - discountPercent / 100));
}
