"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";
import { logAction } from "@/lib/audit/log-action";
import { chileLocalToIso } from "./collections";

export type CollectionActionState = { error?: string; success?: string } | null;

function revalidateCollections() {
  revalidatePath("/admin/colecciones");
  revalidatePath("/tienda");
}

export async function toggleCollectionActive(id: string, isActive: boolean): Promise<CollectionActionState> {
  const actor = await requireRole(["admin", "marketing"]);
  const supabase = await createClient();

  const { error } = await supabase.from("collections").update({ is_active: isActive }).eq("id", id);
  if (error) return { error: "No se pudo cambiar el estado de la colección." };

  await logAction({
    actor,
    action: isActive ? "collection_activated" : "collection_deactivated",
    entityType: "collection",
    entityId: id,
  });
  revalidateCollections();
  return { success: isActive ? "Colección activada." : "Colección desactivada: ya no se ve en la tienda." };
}

// Vacío en ambos = colección permanente.
export async function updateCollectionDates(
  id: string,
  startsAtLocal: string,
  endsAtLocal: string,
): Promise<CollectionActionState> {
  const actor = await requireRole(["admin", "marketing"]);

  const startsAt = startsAtLocal ? chileLocalToIso(startsAtLocal) : null;
  const endsAt = endsAtLocal ? chileLocalToIso(endsAtLocal) : null;
  if ((startsAtLocal && !startsAt) || (endsAtLocal && !endsAt)) return { error: "Fecha inválida." };
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    return { error: "El fin debe ser posterior al inicio." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("collections").update({ starts_at: startsAt, ends_at: endsAt }).eq("id", id);
  if (error) return { error: "No se pudo guardar la vigencia." };

  await logAction({
    actor,
    action: "collection_dates_changed",
    entityType: "collection",
    entityId: id,
    after: { starts_at: startsAt, ends_at: endsAt },
  });
  revalidateCollections();
  return { success: "Vigencia actualizada." };
}

// Reemplaza el conjunto completo de productos de la colección: se agregan los
// que faltan y se quitan los desmarcados, sin tocar los que no cambian.
export async function setCollectionProducts(id: string, productIds: string[]): Promise<CollectionActionState> {
  const actor = await requireRole(["admin", "marketing"]);
  const supabase = await createClient();

  const wanted = new Set(productIds);
  const { data: current, error: readError } = await supabase
    .from("product_collections")
    .select("product_id")
    .eq("collection_id", id);
  if (readError) return { error: "No se pudieron leer los productos de la colección." };

  const existing = new Set((current ?? []).map((r) => r.product_id as string));
  const toAdd = [...wanted].filter((p) => !existing.has(p));
  const toRemove = [...existing].filter((p) => !wanted.has(p));

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("product_collections")
      .insert(toAdd.map((product_id) => ({ product_id, collection_id: id })));
    if (error) return { error: "No se pudieron agregar los productos." };
  }
  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("product_collections")
      .delete()
      .eq("collection_id", id)
      .in("product_id", toRemove);
    if (error) return { error: "No se pudieron quitar los productos." };
  }

  if (toAdd.length > 0 || toRemove.length > 0) {
    await logAction({
      actor,
      action: "collection_products_changed",
      entityType: "collection",
      entityId: id,
      after: { added: toAdd.length, removed: toRemove.length },
    });
  }
  revalidateCollections();
  return { success: `Productos guardados (${wanted.size} en la colección).` };
}
