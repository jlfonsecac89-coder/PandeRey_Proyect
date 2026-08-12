import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { decryptFieldFromStorage } from "@/lib/crypto/encrypt-field";
import { formatRut } from "@/lib/rut";
import { ProfileForm } from "./ProfileForm";
import { DeleteAccountForm } from "./DeleteAccountForm";

export default async function DatosPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  // getCurrentProfile() trae el set reducido que usa el resto del sitio
  // (layout, checks de rol) — acá hace falta además rut/género/fecha de
  // nacimiento, así que se pide aparte en vez de inflar ese helper
  // compartido para todos sus consumidores.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: extra } = await supabase
    .from("profiles")
    .select("rut_encrypted, gender, birth_date")
    .eq("id", profile.id)
    .single();
  const rut = extra?.rut_encrypted ? formatRut(decryptFieldFromStorage(extra.rut_encrypted)) : "";

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">Perfil</p>
      <h1 className="mt-1 font-display text-2xl font-medium text-foreground">Mis datos</h1>
      <div className="mt-4">
        <ProfileForm
          email={user?.email ?? ""}
          fullName={profile.full_name}
          phone={profile.phone}
          rut={rut}
          gender={extra?.gender ?? ""}
          birthDate={extra?.birth_date ?? ""}
        />
      </div>

      <div className="mt-10 border-t border-charcoal-border pt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-burgundy-hover">Zona de riesgo</h2>
        <div className="mt-3">
          <DeleteAccountForm />
        </div>
      </div>
    </div>
  );
}
