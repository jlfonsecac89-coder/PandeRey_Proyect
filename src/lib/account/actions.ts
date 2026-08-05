"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/session";
import { logAction } from "@/lib/audit/log-action";

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

// Baja/anonimización de cuenta (sección 11 y Aceptación 4 de la Fase 12):
// nunca se borra la fila de profiles ni la de auth.users — `orders` e
// `invoices_dte` la referencian y deben sobrevivir intactas por retención
// legal tributaria. Solo se limpia la PII y se bloquea el acceso.
export async function anonymizeAccount(
  _prev: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Necesitás iniciar sesión." };

  const confirmation = String(formData.get("confirmation") || "").trim().toUpperCase();
  if (confirmation !== "ELIMINAR") {
    return { error: 'Escribí "ELIMINAR" para confirmar la baja de tu cuenta.' };
  }

  const admin = createAdminClient();

  // Direcciones que un pedido histórico referencia (orders.address_id) se
  // conservan — borrarlas rompería el detalle de dónde se entregó ese
  // pedido. Las que no están atadas a ningún pedido se eliminan.
  const { data: referencedOrders } = await admin
    .from("orders")
    .select("address_id")
    .eq("user_id", profile.id)
    .not("address_id", "is", null);
  const keepIds = new Set((referencedOrders ?? []).map((o) => o.address_id as string));
  const { data: allAddresses } = await admin.from("addresses").select("id").eq("user_id", profile.id);
  const toDelete = (allAddresses ?? []).map((a) => a.id).filter((id) => !keepIds.has(id));
  if (toDelete.length > 0) {
    await admin.from("addresses").delete().in("id", toDelete);
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: "Usuario eliminado",
      phone: null,
      rut_encrypted: null,
      is_active: false,
      anonymized_at: new Date().toISOString(),
    })
    .eq("id", profile.id);
  if (profileError) return { error: "No se pudo anonimizar la cuenta." };

  // Bloquea el login (email/password aleatorios + ban) SIN borrar la fila de
  // auth.users — borrarla arrastraría en cascada la fila de profiles
  // (on delete cascade en profiles.id), justo lo que no se puede hacer.
  await admin.auth.admin.updateUserById(profile.id, {
    email: `eliminado-${profile.id}@anonimizado.local`,
    password: crypto.randomUUID(),
    ban_duration: "876000h",
  });

  await logAction({
    actor: profile,
    action: "account_anonymized",
    entityType: "profile",
    entityId: profile.id,
  });

  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect("/");
}
