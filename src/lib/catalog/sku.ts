import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// El SKU SIEMPRE se genera server-side (sección 13 del blueprint) — nunca lo
// escribe el staff. Formato: {DEPT_CODE}-{CAT_CODE}-{correlativo de 5 dígitos}.
// No usa una secuencia de Postgres dedicada: para el volumen de un panadería
// (altas de producto son eventos poco frecuentes, no tráfico de clientes),
// alcanza con buscar el máximo existente + reintentar una vez si hay
// colisión por una carrera entre dos altas simultáneas.
export async function generateSku(
  supabase: SupabaseClient,
  categoryId: string,
): Promise<string> {
  const { data: category, error } = await supabase
    .from("categories")
    .select("code, department:departments(code)")
    .eq("id", categoryId)
    .single();

  if (error || !category) {
    throw new Error("No se pudo encontrar la categoría para generar el SKU.");
  }

  const department = Array.isArray(category.department)
    ? category.department[0]
    : category.department;

  const prefix = `${department.code}-${category.code}-`;

  const { data: existing } = await supabase
    .from("products")
    .select("sku")
    .ilike("sku", `${prefix}%`)
    .order("sku", { ascending: false })
    .limit(1);

  let nextSeq = 1;
  if (existing && existing.length > 0) {
    const lastSuffix = existing[0].sku.slice(prefix.length);
    const parsed = parseInt(lastSuffix, 10);
    if (!Number.isNaN(parsed)) nextSeq = parsed + 1;
  }

  return `${prefix}${String(nextSeq).padStart(5, "0")}`;
}

export async function generateUniqueSku(
  supabase: SupabaseClient,
  categoryId: string,
): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    const sku = await generateSku(supabase, categoryId);
    const { data: taken } = await supabase
      .from("products")
      .select("id")
      .eq("sku", sku)
      .maybeSingle();
    if (!taken) return sku;
    lastError = new Error(`SKU ${sku} ya existe, reintentando`);
  }
  throw lastError ?? new Error("No se pudo generar un SKU único.");
}
