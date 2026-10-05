"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";
import { logAction } from "@/lib/audit/log-action";
import { MODULES, type ModuleKey } from "./module-keys";

export type ModuleActionState = { error?: string; success?: string };

export async function toggleModule(moduleKey: ModuleKey, enabled: boolean): Promise<ModuleActionState> {
  const actor = await requireRole(["admin"]);

  const mod = MODULES.find((m) => m.key === moduleKey);
  if (!mod) return { error: "Módulo desconocido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("system_settings")
    .upsert({ key: mod.settingKey, value: enabled ? "true" : "false" }, { onConflict: "key" });
  if (error) return { error: "No se pudo guardar el cambio." };

  await logAction({
    actor,
    action: "module_toggled",
    entityType: "system_setting",
    // audit_log.entity_id es uuid y system_settings se identifica por una clave
    // de texto, así que la clave viaja en after_data.
    entityId: null,
    after: { module: mod.settingKey, enabled },
  });

  // El menú del admin y las pantallas de cada módulo leen estos flags en el
  // layout, así que se invalida todo el árbol del panel.
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  return { success: enabled ? `${mod.label} activado.` : `${mod.label} desactivado.` };
}
