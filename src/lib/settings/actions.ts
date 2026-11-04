"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";
import { KEY_MAP, REFUND_TEMPLATE_KEY, type SystemSettings } from "./system-settings";
import { DEFAULT_REFUND_TEMPLATE, REFUND_TEMPLATE_MAX_LENGTH } from "@/lib/orders/refund-policy";
import { logAction } from "@/lib/audit/log-action";

export type SettingsActionState = { error?: string; success?: string } | null;

export async function updateSystemSettings(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireRole(["admin"]);

  const entries: { field: keyof SystemSettings; min: number; max: number; label: string }[] = [
    { field: "orderPrepSlaMinutes", min: 1, max: 240, label: "SLA de preparación" },
    { field: "maxDeliveryIssueWaitMinutes", min: 1, max: 120, label: "Espera máxima en problema de entrega" },
    { field: "loyaltyPointsPerClp", min: 0, max: 1, label: "Puntos por CLP gastado" },
    { field: "loyaltyPointsToClpRate", min: 0, max: 1000, label: "Valor en CLP de 1 punto" },
    { field: "refundRequestBusinessDays", min: 0, max: 15, label: "Plazo mínimo: días hábiles para solicitar el reembolso" },
    { field: "refundDebitBusinessDays", min: 1, max: 30, label: "Días hábiles de abono en débito" },
    // La ley chilena fija 45 días como máximo para devolver lo pagado.
    { field: "refundMaxDays", min: 1, max: 45, label: "Plazo máximo total de reembolso (días)" },
  ];

  const rows: { key: string; value: string }[] = [];
  for (const { field, min, max, label } of entries) {
    const raw = String(formData.get(field) ?? "").trim();
    const num = Number(raw);
    if (!raw || Number.isNaN(num) || num < min || num > max) {
      return { error: `"${label}" tiene que ser un número entre ${min} y ${max}.` };
    }
    rows.push({ key: KEY_MAP[field], value: String(num) });
  }

  const byKey = new Map(rows.map((r) => [r.key, Number(r.value)]));
  if ((byKey.get(KEY_MAP.refundMaxDays) ?? 0) < (byKey.get(KEY_MAP.refundRequestBusinessDays) ?? 0)) {
    return { error: "El plazo máximo total no puede ser menor que el plazo mínimo para solicitar el reembolso." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("system_settings").upsert(rows, { onConflict: "key" });
  if (error) {
    console.error("[updateSystemSettings]", error);
    return { error: "No se pudieron guardar los ajustes." };
  }

  revalidatePath("/admin/configuracion/sistema");
  revalidatePath("/terminos");
  return { success: "Ajustes guardados." };
}

// Texto de la sección "Cancelaciones, devoluciones y reembolsos" de los
// Términos. Vacío o igual al original = se vuelve a la plantilla por defecto.
export async function updateRefundPolicyText(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const actor = await requireRole(["admin"]);

  const template = String(formData.get("template") ?? "").replace(/\r\n/g, "\n").trim();
  if (template.length > REFUND_TEMPLATE_MAX_LENGTH) {
    return { error: `El texto no puede superar ${REFUND_TEMPLATE_MAX_LENGTH} caracteres.` };
  }

  const supabase = await createClient();
  const useDefault = !template || template === DEFAULT_REFUND_TEMPLATE.trim();
  const { error } = useDefault
    ? await supabase.from("system_settings").delete().eq("key", REFUND_TEMPLATE_KEY)
    : await supabase
        .from("system_settings")
        .upsert({ key: REFUND_TEMPLATE_KEY, value: template, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) {
    console.error("[updateRefundPolicyText]", error);
    return { error: "No se pudo guardar el texto." };
  }

  await logAction({
    actor,
    action: "refund_policy_text_changed",
    entityType: "system_setting",
    entityId: null,
    after: { key: REFUND_TEMPLATE_KEY, default: useDefault, length: template.length },
  });
  revalidatePath("/admin/configuracion/sistema");
  revalidatePath("/terminos");
  return { success: useDefault ? "Texto restaurado al original." : "Texto guardado. Ya se ve en los Términos." };
}
