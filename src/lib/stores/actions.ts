"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";
import { geocodeAddress } from "@/lib/geo/geocode";

export type StoreActionState = { error?: string; success?: string } | null;

function parseOptionalNumber(raw: FormDataEntryValue | null): number | null {
  const str = String(raw ?? "").trim();
  if (!str) return null;
  const num = Number(str);
  return Number.isNaN(num) ? null : num;
}

// "Gestión de sucursales/radio/tramos de envío" es exclusiva de Admin
// (sección 09 del blueprint, módulo de la Fase 6) — geocodifica la dirección
// con el mismo proveedor (OpenRouteService) que usa el checkout, para que el
// origen de la sucursal quede en el mismo sistema de coordenadas que las
// direcciones de los clientes.
export async function createStore(
  _prev: StoreActionState,
  formData: FormData,
): Promise<StoreActionState> {
  await requireRole(["admin"]);

  const name = String(formData.get("name") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const maxRadius = parseOptionalNumber(formData.get("max_delivery_radius_km"));
  const minOrder = parseOptionalNumber(formData.get("min_order_amount"));
  const freeShipping = parseOptionalNumber(formData.get("free_shipping_min_amount"));
  const contactPhone = String(formData.get("contact_phone") || "").trim() || null;
  const contactEmail = String(formData.get("contact_email") || "").trim() || null;

  if (!name || !address || maxRadius === null) {
    return { error: "Completa nombre, dirección y radio máximo de entrega." };
  }

  let geocoded;
  try {
    geocoded = await geocodeAddress(address);
  } catch {
    return { error: "El servicio de geocodificación no está disponible ahora mismo." };
  }
  if (!geocoded) {
    return { error: "No pudimos ubicar esa dirección en el mapa." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("stores").insert({
    name,
    origin_lat: geocoded.lat,
    origin_lng: geocoded.lng,
    max_delivery_radius_km: maxRadius,
    min_order_amount: minOrder,
    free_shipping_min_amount: freeShipping,
    contact_address: address,
    contact_phone: contactPhone,
    contact_email: contactEmail,
  });
  if (error) return { error: "No se pudo crear la sucursal." };

  revalidatePath("/admin/configuracion/sucursales");
  return { success: `Sucursal "${name}" creada.` };
}

export async function updateStoreSettings(
  storeId: string,
  _prev: StoreActionState,
  formData: FormData,
): Promise<StoreActionState> {
  await requireRole(["admin"]);

  const maxRadius = parseOptionalNumber(formData.get("max_delivery_radius_km"));
  const minOrder = parseOptionalNumber(formData.get("min_order_amount"));
  const freeShipping = parseOptionalNumber(formData.get("free_shipping_min_amount"));
  const contactPhone = String(formData.get("contact_phone") || "").trim() || null;
  const contactEmail = String(formData.get("contact_email") || "").trim() || null;
  const instagram = String(formData.get("social_instagram") || "").trim() || null;
  const facebook = String(formData.get("social_facebook") || "").trim() || null;
  const whatsapp = String(formData.get("social_whatsapp") || "").trim() || null;

  if (maxRadius === null) return { error: "El radio máximo de entrega es obligatorio." };

  const socialLinks =
    instagram || facebook || whatsapp ? { instagram, facebook, whatsapp } : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("stores")
    .update({
      max_delivery_radius_km: maxRadius,
      min_order_amount: minOrder,
      free_shipping_min_amount: freeShipping,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      social_links: socialLinks,
    })
    .eq("id", storeId);
  if (error) return { error: "No se pudo actualizar la sucursal." };

  revalidatePath("/admin/configuracion/sucursales");
  revalidatePath("/");
  return { success: "Sucursal actualizada." };
}

export async function toggleStoreActive(storeId: string, isActive: boolean) {
  await requireRole(["admin"]);
  const supabase = await createClient();
  await supabase.from("stores").update({ is_active: isActive }).eq("id", storeId);
  revalidatePath("/admin/configuracion/sucursales");
}

// ---------- Tramos de envío ----------

export async function createShippingZone(
  _prev: StoreActionState,
  formData: FormData,
): Promise<StoreActionState> {
  await requireRole(["admin"]);

  const storeId = String(formData.get("store_id") || "");
  const minKm = parseOptionalNumber(formData.get("min_km"));
  const maxKm = parseOptionalNumber(formData.get("max_km"));
  const price = parseOptionalNumber(formData.get("price"));

  if (!storeId || minKm === null || maxKm === null || price === null) {
    return { error: "Completa sucursal, rango de km y precio." };
  }
  if (minKm >= maxKm) return { error: "El km mínimo debe ser menor que el máximo." };

  const supabase = await createClient();
  const { error } = await supabase.from("shipping_zones").insert({
    store_id: storeId,
    min_km: minKm,
    max_km: maxKm,
    price,
  });
  if (error) return { error: "No se pudo crear el tramo de envío." };

  revalidatePath("/admin/configuracion/sucursales");
  return { success: "Tramo de envío creado." };
}

export async function updateShippingZonePrice(
  zoneId: string,
  _prev: StoreActionState,
  formData: FormData,
): Promise<StoreActionState> {
  await requireRole(["admin"]);

  const price = parseOptionalNumber(formData.get("price"));
  if (price === null) return { error: "Precio inválido." };

  const supabase = await createClient();
  const { error } = await supabase.from("shipping_zones").update({ price }).eq("id", zoneId);
  if (error) return { error: "No se pudo actualizar el tramo." };

  revalidatePath("/admin/configuracion/sucursales");
  return { success: "Tramo actualizado." };
}

export async function toggleShippingZoneActive(zoneId: string, isActive: boolean) {
  await requireRole(["admin"]);
  const supabase = await createClient();
  await supabase.from("shipping_zones").update({ is_active: isActive }).eq("id", zoneId);
  revalidatePath("/admin/configuracion/sucursales");
}
