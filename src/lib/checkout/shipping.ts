import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { getRouteDistanceKm } from "@/lib/geo/directions";

export type ShippingQuote =
  | { ok: true; distanceKm: number | null; shippingCost: number }
  | { ok: false; error: string };

type Store = {
  id: string;
  origin_lat: number;
  origin_lng: number;
  max_delivery_radius_km: number;
  free_shipping_min_amount: number | null;
};

type Address = { lat: number | null; lng: number | null };

// Único punto de cálculo de envío — lo usan tanto la previsualización en el
// checkout como la creación real de la preferencia de pago, para que ambas
// apliquen exactamente la misma regla (Aceptación 2/3/4 de la Fase 4).
export async function computeShipping(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  store: Store;
  deliveryMethod: "pickup" | "shipping";
  address: Address | null;
  subtotal: number;
}): Promise<ShippingQuote> {
  const { supabase, store, deliveryMethod, address, subtotal } = params;

  if (deliveryMethod === "pickup") {
    return { ok: true, distanceKm: null, shippingCost: 0 };
  }

  if (!address || address.lat === null || address.lng === null) {
    return { ok: false, error: "La dirección elegida no está geocodificada." };
  }

  const distanceKm = await getRouteDistanceKm(
    { lat: store.origin_lat, lng: store.origin_lng },
    { lat: address.lat, lng: address.lng },
  );
  if (distanceKm === null) {
    return { ok: false, error: "No se pudo calcular la distancia de entrega en este momento." };
  }

  if (distanceKm > store.max_delivery_radius_km) {
    return {
      ok: false,
      error: `Esa dirección está fuera del rango de despacho de esta sucursal (máx. ${store.max_delivery_radius_km} km, tu distancia: ${distanceKm.toFixed(1)} km). Debe realizar retiro en tienda.`,
    };
  }

  if (store.free_shipping_min_amount !== null && subtotal >= store.free_shipping_min_amount) {
    return { ok: true, distanceKm, shippingCost: 0 };
  }

  const { data: zone } = await supabase
    .from("shipping_zones")
    .select("price")
    .eq("store_id", store.id)
    .eq("is_active", true)
    .lte("min_km", distanceKm)
    .gt("max_km", distanceKm)
    .maybeSingle();

  if (!zone) {
    return { ok: false, error: "No hay un tramo de envío configurado para esa distancia." };
  }

  return { ok: true, distanceKm, shippingCost: zone.price };
}
