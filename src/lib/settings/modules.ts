import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MODULES, type ModuleFlags, type ModuleKey } from "./module-keys";

// Un módulo sin fila en system_settings cuenta como APAGADO: el lanzamiento
// parte con solo retiro, sin stock, sin delivery, sin boletas y sin
// transferencia, y encender uno es una decisión explícita del admin.
export const getModuleFlags = cache(async (): Promise<ModuleFlags> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("system_settings")
    .select("key, value")
    .in(
      "key",
      MODULES.map((m) => m.settingKey),
    );
  const map = new Map((data ?? []).map((r) => [r.key, r.value]));

  const flags = {} as ModuleFlags;
  for (const m of MODULES) flags[m.key] = map.get(m.settingKey) === "true";
  return flags;
});

export async function isModuleEnabled(key: ModuleKey): Promise<boolean> {
  return (await getModuleFlags())[key];
}

// Para páginas de un módulo apagado: ocultar el link del menú no alcanza,
// la URL directa tiene que redirigir también.
export async function requireModule(key: ModuleKey, redirectTo = "/admin"): Promise<void> {
  if (!(await isModuleEnabled(key))) redirect(redirectTo);
}
