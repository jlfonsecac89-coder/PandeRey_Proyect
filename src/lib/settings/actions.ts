"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";
import { KEY_MAP, type SystemSettings } from "./system-settings";

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

  const supabase = await createClient();
  const { error } = await supabase.from("system_settings").upsert(rows, { onConflict: "key" });
  if (error) return { error: "No se pudieron guardar los ajustes." };

  revalidatePath("/admin/configuracion/sistema");
  return { success: "Ajustes guardados." };
}
