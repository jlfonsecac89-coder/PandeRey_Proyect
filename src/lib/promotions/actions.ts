"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";
import { logAction } from "@/lib/audit/log-action";

export type PromotionActionState = { error?: string; success?: string } | null;

// Promociones/cupones: módulo de Admin y Marketing (sección 09) — la RLS
// (staff_manage_promotions) ya limita la escritura a esos dos roles; acá se
// revalida con requireRole (Capa 2) y se registra en audit_log (sección 15:
// "aplicación/creación de descuentos y cupones").
export async function createPromotion(
  _prev: PromotionActionState,
  formData: FormData,
): Promise<PromotionActionState> {
  const profile = await requireRole(["admin", "marketing"]);

  const code = String(formData.get("code") || "").trim().toUpperCase() || null;
  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "");
  const valueRaw = String(formData.get("value") || "");
  const maxDiscountRaw = String(formData.get("max_discount_amount") || "");
  const minOrderRaw = String(formData.get("min_order_amount") || "");
  const maxUsesRaw = String(formData.get("max_uses") || "");
  const singleUsePerCustomer = formData.get("single_use_per_customer") === "on";
  const startsAtRaw = String(formData.get("starts_at") || "");
  const endsAtRaw = String(formData.get("ends_at") || "");
  const departmentId = String(formData.get("department_id") || "") || null;
  const categoryId = String(formData.get("category_id") || "") || null;
  const productId = String(formData.get("product_id") || "") || null;
  const targetSegment = String(formData.get("target_segment") || "") || null;

  if (!name || !type || !valueRaw || !startsAtRaw || !endsAtRaw) {
    return { error: "Completa nombre, tipo, valor y vigencia." };
  }
  if (type !== "percentage" && type !== "fixed_amount") {
    return { error: "Tipo de descuento inválido." };
  }
  const value = Number(valueRaw);
  if (Number.isNaN(value) || value <= 0) return { error: "El valor debe ser mayor que 0." };
  if (type === "percentage" && value > 100) return { error: "Un descuento porcentual no puede superar 100%." };

  const scopeCount = [departmentId, categoryId, productId].filter(Boolean).length;
  if (scopeCount > 1) {
    return { error: "Elegí como máximo un alcance: departamento, categoría o producto." };
  }

  const startsAt = new Date(startsAtRaw);
  const endsAt = new Date(endsAtRaw);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    return { error: "La vigencia no es válida." };
  }

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("promotions")
    .insert({
      code,
      name,
      type,
      value,
      max_discount_amount: maxDiscountRaw ? Number(maxDiscountRaw) : null,
      department_id: departmentId,
      category_id: categoryId,
      product_id: productId,
      min_order_amount: minOrderRaw ? Number(minOrderRaw) : 0,
      single_use_per_customer: singleUsePerCustomer,
      max_uses: maxUsesRaw ? Number(maxUsesRaw) : null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      target_segment: targetSegment,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !created) {
    if (error?.code === "23505") return { error: "Ya existe una promoción con ese código." };
    return { error: "No se pudo crear la promoción." };
  }

  await logAction({
    actor: profile,
    action: "promotion_created",
    entityType: "promotion",
    entityId: created.id,
    after: { code, name, type, value },
  });

  revalidatePath("/admin/promociones");
  return { success: `Promoción "${name}" creada.` };
}

// Edita una promoción/cupón existente — mismas validaciones que
// createPromotion, reutilizadas para no divergir las reglas de negocio entre
// crear y editar (ej. no se podría guardar un % de descuento > 100 al crear
// pero sí al editar).
export async function updatePromotion(
  promotionId: string,
  _prev: PromotionActionState,
  formData: FormData,
): Promise<PromotionActionState> {
  const profile = await requireRole(["admin", "marketing"]);

  const code = String(formData.get("code") || "").trim().toUpperCase() || null;
  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "");
  const valueRaw = String(formData.get("value") || "");
  const maxDiscountRaw = String(formData.get("max_discount_amount") || "");
  const minOrderRaw = String(formData.get("min_order_amount") || "");
  const maxUsesRaw = String(formData.get("max_uses") || "");
  const singleUsePerCustomer = formData.get("single_use_per_customer") === "on";
  const startsAtRaw = String(formData.get("starts_at") || "");
  const endsAtRaw = String(formData.get("ends_at") || "");
  const departmentId = String(formData.get("department_id") || "") || null;
  const categoryId = String(formData.get("category_id") || "") || null;
  const productId = String(formData.get("product_id") || "") || null;
  const targetSegment = String(formData.get("target_segment") || "") || null;

  if (!name || !type || !valueRaw || !startsAtRaw || !endsAtRaw) {
    return { error: "Completa nombre, tipo, valor y vigencia." };
  }
  if (type !== "percentage" && type !== "fixed_amount") {
    return { error: "Tipo de descuento inválido." };
  }
  const value = Number(valueRaw);
  if (Number.isNaN(value) || value <= 0) return { error: "El valor debe ser mayor que 0." };
  if (type === "percentage" && value > 100) return { error: "Un descuento porcentual no puede superar 100%." };

  const scopeCount = [departmentId, categoryId, productId].filter(Boolean).length;
  if (scopeCount > 1) {
    return { error: "Elegí como máximo un alcance: departamento, categoría o producto." };
  }

  const startsAt = new Date(startsAtRaw);
  const endsAt = new Date(endsAtRaw);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    return { error: "La vigencia no es válida." };
  }

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("promotions")
    .select("code, name, type, value, target_segment")
    .eq("id", promotionId)
    .maybeSingle();

  const { error } = await supabase
    .from("promotions")
    .update({
      code,
      name,
      type,
      value,
      max_discount_amount: maxDiscountRaw ? Number(maxDiscountRaw) : null,
      department_id: departmentId,
      category_id: categoryId,
      product_id: productId,
      min_order_amount: minOrderRaw ? Number(minOrderRaw) : 0,
      single_use_per_customer: singleUsePerCustomer,
      max_uses: maxUsesRaw ? Number(maxUsesRaw) : null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      target_segment: targetSegment,
    })
    .eq("id", promotionId);

  if (error) {
    if (error.code === "23505") return { error: "Ya existe una promoción con ese código." };
    return { error: "No se pudo guardar la promoción." };
  }

  await logAction({
    actor: profile,
    action: "promotion_updated",
    entityType: "promotion",
    entityId: promotionId,
    before,
    after: { code, name, type, value, target_segment: targetSegment },
  });

  revalidatePath("/admin/promociones");
  return { success: `Promoción "${name}" actualizada.` };
}

export async function togglePromotionActive(promotionId: string, isActive: boolean) {
  await requireRole(["admin", "marketing"]);
  const supabase = await createClient();
  await supabase.from("promotions").update({ is_active: isActive }).eq("id", promotionId);
  revalidatePath("/admin/promociones");
}
