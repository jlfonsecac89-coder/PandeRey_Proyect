"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";
import { logAction } from "@/lib/audit/log-action";
import { normalizeName, slugify } from "./normalize";
import { generateUniqueSku } from "./sku";
import { parseCsv } from "./csv";

export type ImportState = { error?: string; success?: string; importId?: string } | null;

type CsvRow = {
  departamento_codigo?: string;
  categoria_codigo?: string;
  nombre?: string;
  descripcion?: string;
  precio?: string;
  sin_gluten?: string;
  grupo_opcion?: string;
  valor_opcion?: string;
  recargo_opcion?: string;
};

const TRUE_VALUES = new Set(["true", "si", "sí", "1", "yes"]);

// Carga masiva de productos (sección 13 del blueprint). Procesa el CSV fila
// a fila, EN ORDEN — necesario para que dos filas del mismo producto base
// dentro del mismo archivo (ej. dos rellenos distintos) se reconozcan entre
// sí: la primera crea el producto, la segunda ya lo encuentra y agrega la
// variante, sin depender de una segunda pasada.
export async function importProductsCsv(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const profile = await requireRole(["admin", "operaciones"]);

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Seleccioná un archivo CSV." };

  const text = await file.text();
  const rows = parseCsv(text) as CsvRow[];
  if (rows.length === 0) return { error: "El archivo está vacío o no tiene filas de datos." };

  const supabase = await createClient();

  const { data: importRow, error: importError } = await supabase
    .from("product_imports")
    .insert({ uploaded_by: profile.id, file_name: file.name, status: "processing", total_rows: rows.length })
    .select("id")
    .single();
  if (importError || !importRow) return { error: "No se pudo iniciar la importación." };

  const { data: depts } = await supabase.from("departments").select("id, code");
  const { data: cats } = await supabase.from("categories").select("id, code, department_id");
  const deptByCode = new Map((depts ?? []).map((d) => [d.code.toUpperCase(), d.id]));
  const catByDeptAndCode = new Map((cats ?? []).map((c) => [`${c.department_id}::${c.code.toUpperCase()}`, c.id]));

  let newCount = 0;
  let pendingCount = 0;
  let unchangedCount = 0;
  let variantCount = 0;
  let failedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;
    const nombre = (row.nombre || "").trim();
    const deptCode = (row.departamento_codigo || "").trim().toUpperCase();
    const catCode = (row.categoria_codigo || "").trim().toUpperCase();
    const precioRaw = (row.precio || "").trim();
    const precio = Number(precioRaw);
    const grupoOpcion = (row.grupo_opcion || "").trim();
    const valorOpcion = (row.valor_opcion || "").trim();
    const recargoOpcion = Number(row.recargo_opcion || "0") || 0;
    const descripcion = (row.descripcion || "").trim() || null;
    const isGlutenFree = TRUE_VALUES.has((row.sin_gluten || "").trim().toLowerCase());

    async function recordFailure(errorMessage: string) {
      failedCount++;
      await supabase.from("product_import_rows").insert({
        import_id: importRow!.id,
        row_number: rowNumber,
        raw_data: { ...row, _error: errorMessage },
        match_type: "new",
        resolution: "rejected",
        resolved_by: profile.id,
        resolved_at: new Date().toISOString(),
      });
    }

    if (!nombre || !deptCode || !catCode || !precioRaw || Number.isNaN(precio) || precio < 0) {
      await recordFailure("Faltan campos obligatorios o el precio no es válido.");
      continue;
    }

    const departmentId = deptByCode.get(deptCode);
    if (!departmentId) {
      await recordFailure(`No existe un departamento con código "${deptCode}".`);
      continue;
    }
    const categoryId = catByDeptAndCode.get(`${departmentId}::${catCode}`);
    if (!categoryId) {
      await recordFailure(`No existe la categoría "${catCode}" en ese departamento.`);
      continue;
    }

    const nameNormalized = normalizeName(nombre);
    const { data: existingProduct } = await supabase
      .from("products")
      .select("id, description, price")
      .eq("category_id", categoryId)
      .eq("name_normalized", nameNormalized)
      .maybeSingle();

    if (!existingProduct) {
      // --- new ---
      let sku: string;
      try {
        sku = await generateUniqueSku(supabase, categoryId);
      } catch {
        await recordFailure("No se pudo generar el SKU automáticamente.");
        continue;
      }

      const { data: created, error: createError } = await supabase
        .from("products")
        .insert({
          category_id: categoryId,
          name: nombre,
          slug: `${slugify(nombre)}-${sku.toLowerCase()}`,
          description: descripcion,
          price: precio,
          sku,
          is_gluten_free: isGlutenFree,
        })
        .select("id")
        .single();

      if (createError || !created) {
        await recordFailure("No se pudo crear el producto (¿nombre duplicado?).");
        continue;
      }

      if (grupoOpcion && valorOpcion) {
        const { data: group } = await supabase
          .from("product_option_groups")
          .insert({ product_id: created.id, name: grupoOpcion })
          .select("id")
          .single();
        if (group) {
          await supabase
            .from("product_option_values")
            .insert({ option_group_id: group.id, name: valorOpcion, price_delta: recargoOpcion });
        }
      }

      newCount++;
      await supabase.from("product_import_rows").insert({
        import_id: importRow.id,
        row_number: rowNumber,
        raw_data: row,
        match_type: "new",
        matched_product_id: created.id,
        resolution: "approved",
        resolved_by: profile.id,
        resolved_at: new Date().toISOString(),
      });
      continue;
    }

    if (grupoOpcion && valorOpcion) {
      // --- new_variant (o ya existe esa variante) ---
      const { data: groups } = await supabase
        .from("product_option_groups")
        .select("id, name")
        .eq("product_id", existingProduct.id);
      let group = (groups ?? []).find((g) => normalizeName(g.name) === normalizeName(grupoOpcion));

      if (!group) {
        const { data: createdGroup } = await supabase
          .from("product_option_groups")
          .insert({ product_id: existingProduct.id, name: grupoOpcion })
          .select("id, name")
          .single();
        if (!createdGroup) {
          await recordFailure("No se pudo crear el grupo de opciones.");
          continue;
        }
        group = createdGroup;
      }

      const { data: values } = await supabase
        .from("product_option_values")
        .select("id, name")
        .eq("option_group_id", group.id);
      const alreadyHasValue = (values ?? []).some((v) => normalizeName(v.name) === normalizeName(valorOpcion));

      if (alreadyHasValue) {
        unchangedCount++;
        await supabase.from("product_import_rows").insert({
          import_id: importRow.id,
          row_number: rowNumber,
          raw_data: row,
          match_type: "identical",
          matched_product_id: existingProduct.id,
          resolution: "approved",
          resolved_by: profile.id,
          resolved_at: new Date().toISOString(),
        });
        continue;
      }

      await supabase
        .from("product_option_values")
        .insert({ option_group_id: group.id, name: valorOpcion, price_delta: recargoOpcion });

      variantCount++;
      await supabase.from("product_import_rows").insert({
        import_id: importRow.id,
        row_number: rowNumber,
        raw_data: row,
        match_type: "new_variant",
        matched_product_id: existingProduct.id,
        resolution: "approved",
        resolved_by: profile.id,
        resolved_at: new Date().toISOString(),
      });
      continue;
    }

    // --- identical vs description_changed ---
    const descriptionChanged = (existingProduct.description ?? "") !== (descripcion ?? "");
    const priceChanged = Number(existingProduct.price) !== precio;

    if (!descriptionChanged && !priceChanged) {
      unchangedCount++;
      await supabase.from("product_import_rows").insert({
        import_id: importRow.id,
        row_number: rowNumber,
        raw_data: row,
        match_type: "identical",
        matched_product_id: existingProduct.id,
        resolution: "approved",
        resolved_by: profile.id,
        resolved_at: new Date().toISOString(),
      });
      continue;
    }

    pendingCount++;
    await supabase.from("product_import_rows").insert({
      import_id: importRow.id,
      row_number: rowNumber,
      raw_data: row,
      match_type: "description_changed",
      matched_product_id: existingProduct.id,
      resolution: "pending",
    });
  }

  await supabase
    .from("product_imports")
    .update({
      status: pendingCount > 0 ? "pending_review" : "completed",
      new_products: newCount,
      updated_pending: pendingCount,
      unchanged: unchangedCount,
      new_variants: variantCount,
    })
    .eq("id", importRow.id);

  revalidatePath("/admin/productos/importar");
  revalidatePath("/admin/productos");

  const failedSuffix = failedCount ? `, ${failedCount} con error` : "";
  return {
    success: `Importación completa: ${newCount} nuevos, ${pendingCount} pendientes de confirmar, ${unchangedCount} sin cambios, ${variantCount} variantes agregadas${failedSuffix}.`,
    importId: importRow.id,
  };
}

// Aprueba o rechaza una fila `description_changed` pendiente. Al aprobar,
// aplica el cambio real al producto (misma auditoría que la edición manual
// de precio en updateProduct, sección 15: "cambios de precio").
export async function resolveImportRow(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const profile = await requireRole(["admin", "operaciones"]);

  const rowId = String(formData.get("row_id") || "");
  const approve = formData.get("approve") === "true";
  if (!rowId) return { error: "Fila inválida." };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("product_import_rows")
    .select("id, import_id, raw_data, matched_product_id, resolution")
    .eq("id", rowId)
    .maybeSingle();

  if (!row || row.resolution !== "pending") return { error: "Esta fila ya fue resuelta." };

  if (approve && row.matched_product_id) {
    const raw = row.raw_data as CsvRow;
    const descripcion = (raw.descripcion || "").trim() || null;
    const precio = Number(raw.precio || "");

    const { data: before } = await supabase
      .from("products")
      .select("price")
      .eq("id", row.matched_product_id)
      .maybeSingle();

    const { error: updateError } = await supabase
      .from("products")
      .update({ description: descripcion, price: precio })
      .eq("id", row.matched_product_id);
    if (updateError) return { error: "No se pudo aplicar el cambio al producto." };

    if (before && Number(before.price) !== precio) {
      await logAction({
        actor: profile,
        action: "product_price_changed",
        entityType: "product",
        entityId: row.matched_product_id,
        before: { price: before.price },
        after: { price: precio },
      });
    }
  }

  await supabase
    .from("product_import_rows")
    .update({
      resolution: approve ? "approved" : "rejected",
      resolved_by: profile.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", rowId);

  // Si ya no quedan filas pendientes, la importación pasa a completed.
  const { data: stillPending } = await supabase
    .from("product_import_rows")
    .select("id")
    .eq("import_id", row.import_id)
    .eq("resolution", "pending")
    .limit(1);
  if (!stillPending || stillPending.length === 0) {
    await supabase.from("product_imports").update({ status: "completed" }).eq("id", row.import_id);
  }

  revalidatePath("/admin/productos/importar");
  revalidatePath(`/admin/productos/${row.matched_product_id}`);
  return { success: approve ? "Cambio aplicado." : "Cambio rechazado." };
}
