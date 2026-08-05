"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";
import { logAction } from "@/lib/audit/log-action";
import { normalizeName, slugify } from "./normalize";
import { generateUniqueSku } from "./sku";

export type CatalogActionState = { error?: string; success?: string } | null;

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

// ---------- Departamentos (solo Admin) ----------

export async function createDepartment(
  _prev: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  await requireRole(["admin"]);

  const name = String(formData.get("name") || "").trim();
  const code = String(formData.get("code") || "").trim().toUpperCase();
  if (!name || !code) return { error: "Completa nombre y código." };

  const supabase = await createClient();

  const { data: conflict } = await supabase
    .from("departments")
    .select("id")
    .eq("name_normalized", normalizeName(name))
    .maybeSingle();
  if (conflict) return { error: `Ya existe un departamento llamado "${name}".` };

  const { error } = await supabase.from("departments").insert({
    name,
    code,
    slug: slugify(name),
  });

  if (error) {
    if (isUniqueViolation(error)) {
      return { error: "Ya existe un departamento con ese nombre o código." };
    }
    return { error: "No se pudo crear el departamento." };
  }

  revalidatePath("/admin/departamentos");
  return { success: `Departamento "${name}" creado.` };
}

export async function toggleDepartmentActive(id: string, isActive: boolean) {
  await requireRole(["admin"]);
  const supabase = await createClient();
  await supabase.from("departments").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/admin/departamentos");
}

// ---------- Categorías (solo Admin) ----------

export async function createCategory(
  _prev: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  await requireRole(["admin"]);

  const name = String(formData.get("name") || "").trim();
  const code = String(formData.get("code") || "").trim().toUpperCase();
  const departmentId = String(formData.get("department_id") || "");
  const parentId = String(formData.get("parent_id") || "") || null;

  if (!name || !code || !departmentId) {
    return { error: "Completa nombre, código y departamento." };
  }

  const supabase = await createClient();

  const { data: conflict } = await supabase
    .from("categories")
    .select("id")
    .eq("department_id", departmentId)
    .eq("name_normalized", normalizeName(name))
    .maybeSingle();
  if (conflict) {
    return { error: `Ya existe una categoría llamada "${name}" en ese departamento.` };
  }

  const { error } = await supabase.from("categories").insert({
    department_id: departmentId,
    parent_id: parentId,
    name,
    code,
    slug: slugify(name),
  });

  if (error) {
    if (isUniqueViolation(error)) {
      return { error: "Ya existe una categoría con ese nombre en ese departamento." };
    }
    return { error: "No se pudo crear la categoría." };
  }

  revalidatePath("/admin/categorias");
  return { success: `Categoría "${name}" creada.` };
}

export async function toggleCategoryActive(id: string, isActive: boolean) {
  await requireRole(["admin"]);
  const supabase = await createClient();
  await supabase.from("categories").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/admin/categorias");
}

// ---------- Colecciones (Admin + Marketing) ----------

export async function createCollection(
  _prev: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  await requireRole(["admin", "marketing"]);

  const name = String(formData.get("name") || "").trim();
  const startsAt = String(formData.get("starts_at") || "") || null;
  const endsAt = String(formData.get("ends_at") || "") || null;

  if (!name) return { error: "Ingresa un nombre." };

  const supabase = await createClient();

  const { data: conflict } = await supabase
    .from("collections")
    .select("id")
    .eq("name_normalized", normalizeName(name))
    .maybeSingle();
  if (conflict) return { error: `Ya existe una colección llamada "${name}".` };

  const { error } = await supabase.from("collections").insert({
    name,
    slug: slugify(name),
    starts_at: startsAt,
    ends_at: endsAt,
  });

  if (error) {
    if (isUniqueViolation(error)) return { error: "Ya existe una colección con ese nombre." };
    return { error: "No se pudo crear la colección." };
  }

  revalidatePath("/admin/colecciones");
  return { success: `Colección "${name}" creada.` };
}

export async function setProductCollection(
  productId: string,
  collectionId: string,
  shouldBelong: boolean,
) {
  await requireRole(["admin", "marketing"]);
  const supabase = await createClient();

  if (shouldBelong) {
    await supabase
      .from("product_collections")
      .upsert({ product_id: productId, collection_id: collectionId });
  } else {
    await supabase
      .from("product_collections")
      .delete()
      .eq("product_id", productId)
      .eq("collection_id", collectionId);
  }

  revalidatePath(`/admin/productos/${productId}`);
}

// ---------- Productos (Admin + Operaciones) ----------

export async function createProduct(
  _prev: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  await requireRole(["admin", "operaciones"]);

  const name = String(formData.get("name") || "").trim();
  const categoryId = String(formData.get("category_id") || "");
  const description = String(formData.get("description") || "").trim() || null;
  const priceRaw = String(formData.get("price") || "");
  const isGlutenFree = formData.get("is_gluten_free") === "on";
  const isSpecialEvent = formData.get("is_special_event") === "on";
  const eventCollectionId = String(formData.get("event_collection_id") || "") || null;
  const maxOrdersRaw = String(formData.get("max_orders") || "");
  const requiresProductionNotes = formData.get("requires_production_notes") === "on";

  if (!name || !categoryId || !priceRaw) {
    return { error: "Completa nombre, categoría y precio." };
  }
  const price = Number(priceRaw);
  if (Number.isNaN(price) || price < 0) return { error: "El precio no es válido." };

  if (isSpecialEvent && !eventCollectionId) {
    return { error: "Un producto de evento necesita la colección de evento que lo activa." };
  }

  const supabase = await createClient();

  const { data: conflict } = await supabase
    .from("products")
    .select("id")
    .eq("category_id", categoryId)
    .eq("name_normalized", normalizeName(name))
    .maybeSingle();
  if (conflict) {
    return { error: `Ya existe un producto llamado "${name}" en esa categoría.` };
  }

  let sku: string;
  try {
    sku = await generateUniqueSku(supabase, categoryId);
  } catch {
    return { error: "No se pudo generar el SKU automáticamente." };
  }

  const { data: created, error } = await supabase
    .from("products")
    .insert({
      category_id: categoryId,
      name,
      slug: `${slugify(name)}-${sku.toLowerCase()}`,
      description,
      price,
      sku,
      is_gluten_free: isGlutenFree,
      is_special_event: isSpecialEvent,
      event_collection_id: isSpecialEvent ? eventCollectionId : null,
      max_orders: isSpecialEvent && maxOrdersRaw ? Number(maxOrdersRaw) : null,
      requires_production_notes: isSpecialEvent && requiresProductionNotes,
    })
    .select("id")
    .single();

  if (error || !created) {
    if (isUniqueViolation(error)) {
      return { error: "Ya existe un producto con ese nombre o SKU." };
    }
    return { error: "No se pudo crear el producto." };
  }

  revalidatePath("/admin/productos");
  return { success: `Producto "${name}" creado con SKU ${sku}.` };
}

export async function updateProduct(
  productId: string,
  _prev: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  const profile = await requireRole(["admin", "operaciones"]);

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const priceRaw = String(formData.get("price") || "");
  const isGlutenFree = formData.get("is_gluten_free") === "on";
  const isActive = formData.get("is_active") === "on";

  if (!name || !priceRaw) return { error: "Completa nombre y precio." };
  const price = Number(priceRaw);
  if (Number.isNaN(price) || price < 0) return { error: "El precio no es válido." };

  const supabase = await createClient();

  const { data: before } = await supabase
    .from("products")
    .select("price")
    .eq("id", productId)
    .maybeSingle();

  const { error } = await supabase
    .from("products")
    .update({ name, description, price, is_gluten_free: isGlutenFree, is_active: isActive })
    .eq("id", productId);

  if (error) {
    if (isUniqueViolation(error)) return { error: "Ya existe otro producto con ese nombre." };
    return { error: "No se pudo actualizar el producto." };
  }

  // Aceptación 1 de la Fase 7: solo se audita cuando el precio realmente
  // cambia, y solo ese campo — before_data/after_data no llevan la fila
  // completa (sección 15: "sin exponer campos redactados de más").
  if (before && before.price !== price) {
    await logAction({
      actor: profile,
      action: "product_price_changed",
      entityType: "product",
      entityId: productId,
      before: { price: before.price },
      after: { price },
    });
  }

  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath("/admin/productos");
  return { success: "Producto actualizado." };
}

// Único punto de escritura de Marketing sobre `products` (sección 13):
// exclusivamente el campo points_cost, a través del módulo "Canje de puntos".
export async function updateProductPointsCost(
  _prev: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  await requireRole(["admin", "marketing"]);

  const productId = String(formData.get("product_id") || "");
  const pointsCostRaw = String(formData.get("points_cost") || "");
  const pointsCost = pointsCostRaw === "" ? null : Number(pointsCostRaw);

  if (!productId) return { error: "Producto inválido." };
  if (pointsCost !== null && (Number.isNaN(pointsCost) || pointsCost < 0)) {
    return { error: "El costo en puntos no es válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ points_cost: pointsCost })
    .eq("id", productId);

  if (error) return { error: "No se pudo actualizar el costo en puntos." };

  revalidatePath("/admin/canje-de-puntos");
  return { success: "Costo en puntos actualizado." };
}

// ---------- Imágenes de producto (Admin + Operaciones) ----------

export async function uploadProductImage(
  _prev: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  await requireRole(["admin", "operaciones"]);

  const productId = String(formData.get("product_id") || "");
  const file = formData.get("file") as File | null;
  if (!productId || !file || file.size === 0) {
    return { error: "Selecciona una imagen para subir." };
  }
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    return { error: "Formato no soportado. Usa PNG, JPG o WEBP." };
  }

  const supabase = await createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${productId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(path, file, { contentType: file.type });
  if (uploadError) return { error: "No se pudo subir la imagen." };

  const { error: insertError } = await supabase.from("product_images").insert({
    product_id: productId,
    storage_path: path,
  });
  if (insertError) {
    await supabase.storage.from("product-images").remove([path]);
    return { error: "No se pudo registrar la imagen." };
  }

  revalidatePath(`/admin/productos/${productId}`);
  return { success: "Imagen subida." };
}

export async function deleteProductImage(imageId: string, productId: string, path: string) {
  await requireRole(["admin", "operaciones"]);
  const supabase = await createClient();
  await supabase.storage.from("product-images").remove([path]);
  await supabase.from("product_images").delete().eq("id", imageId);
  revalidatePath(`/admin/productos/${productId}`);
}

// ---------- Variantes (grupos de opciones) — Admin + Operaciones ----------

export async function createOptionGroup(
  _prev: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  await requireRole(["admin", "operaciones"]);

  const productId = String(formData.get("product_id") || "");
  const name = String(formData.get("name") || "").trim();
  const selectionType = String(formData.get("selection_type") || "single");

  if (!productId || !name) return { error: "Completa el nombre del grupo." };

  const supabase = await createClient();
  const { error } = await supabase.from("product_option_groups").insert({
    product_id: productId,
    name,
    selection_type: selectionType,
  });

  if (error) return { error: "No se pudo crear el grupo de opciones." };

  revalidatePath(`/admin/productos/${productId}`);
  return { success: `Grupo "${name}" creado.` };
}

export async function createOptionValue(
  _prev: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  await requireRole(["admin", "operaciones"]);

  const optionGroupId = String(formData.get("option_group_id") || "");
  const productId = String(formData.get("product_id") || "");
  const name = String(formData.get("name") || "").trim();
  const priceDeltaRaw = String(formData.get("price_delta") || "0");

  if (!optionGroupId || !name) return { error: "Completa el nombre del valor." };
  const priceDelta = Number(priceDeltaRaw || 0);
  if (Number.isNaN(priceDelta)) return { error: "El recargo no es válido." };

  const supabase = await createClient();
  const { error } = await supabase.from("product_option_values").insert({
    option_group_id: optionGroupId,
    name,
    price_delta: priceDelta,
  });

  if (error) return { error: "No se pudo crear el valor de opción." };

  revalidatePath(`/admin/productos/${productId}`);
  return { success: `Valor "${name}" agregado.` };
}

// ---------- Stock (lotes) — Admin + Operaciones, scoped a su sucursal por RLS ----------

export async function addStockBatch(
  _prev: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  const profile = await requireRole(["admin", "operaciones"]);

  const productId = String(formData.get("product_id") || "");
  const storeId = String(formData.get("store_id") || "");
  const quantityRaw = String(formData.get("quantity") || "");
  const expirationDate = String(formData.get("expiration_date") || "") || null;

  if (!productId || !storeId || !quantityRaw) {
    return { error: "Completa sucursal y cantidad." };
  }
  const quantity = Number(quantityRaw);
  if (!Number.isInteger(quantity) || quantity < 0) {
    return { error: "La cantidad no es válida." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("product_batches").insert({
    product_id: productId,
    store_id: storeId,
    quantity,
    expiration_date: expirationDate,
    created_by: profile.id,
  });

  // RLS es quien realmente bloquea a Marketing/Repartidor u Operaciones de otra
  // sucursal (sección 13) — este error confirma que la Capa 3 funcionó.
  if (error) return { error: "No se pudo cargar el lote (¿sucursal correcta?)." };

  revalidatePath(`/admin/productos/${productId}`);
  return { success: "Lote de stock cargado." };
}

// Liquidación por lote (sección 13): nunca sobre el producto completo, solo
// sobre las unidades del lote marcado — así el descuento no arriesga vender
// con rebaja unidades de un lote más nuevo que todavía tiene vida útil.
export async function setBatchClearance(
  batchId: string,
  productId: string,
  _prev: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  await requireRole(["admin", "operaciones"]);

  const isClearance = formData.get("is_clearance") === "on";
  const discountRaw = String(formData.get("clearance_discount_percent") || "");
  const discount = discountRaw ? Number(discountRaw) : null;

  if (isClearance && (discount === null || Number.isNaN(discount) || discount <= 0 || discount > 90)) {
    return { error: "Ingresá un porcentaje de descuento válido (1-90) para poner el lote en liquidación." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("product_batches")
    .update({
      is_clearance: isClearance,
      clearance_discount_percent: isClearance ? discount : null,
    })
    .eq("id", batchId);

  // RLS bloquea a Operaciones de otra sucursal — mismo comentario que
  // addStockBatch.
  if (error) return { error: "No se pudo actualizar la liquidación del lote." };

  revalidatePath(`/admin/productos/${productId}`);
  return { success: isClearance ? "Lote marcado en liquidación." : "Liquidación desactivada." };
}
