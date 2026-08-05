"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";

export type AccountActionState = { error?: string; success?: string } | null;

export async function updateProfileInfo(
  _prev: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Necesitás iniciar sesión." };

  const fullName = String(formData.get("full_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;

  if (!fullName) return { error: "El nombre no puede estar vacío." };

  // self_update_profile (RLS) permite que el cliente edite su propia fila,
  // pero el trigger protect_profile_columns bloquea cualquier intento de
  // tocar role/points_balance/etc — acá solo se envían full_name/phone, que
  // sí están permitidos.
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone })
    .eq("id", profile.id);

  if (error) return { error: "No se pudo actualizar tus datos." };

  revalidatePath("/cuenta/datos");
  revalidatePath("/cuenta", "layout");
  return { success: "Datos actualizados." };
}

export async function deleteAddress(addressId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return;

  const supabase = await createClient();
  await supabase.from("addresses").delete().eq("id", addressId).eq("user_id", profile.id);
  revalidatePath("/cuenta/direcciones");
}
