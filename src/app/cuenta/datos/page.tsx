import { getCurrentProfile } from "@/lib/auth/session";
import { ProfileForm } from "./ProfileForm";
import { DeleteAccountForm } from "./DeleteAccountForm";

export default async function DatosPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">Perfil</p>
      <h1 className="mt-1 font-display text-2xl font-medium text-foreground">Mis datos</h1>
      <div className="mt-4">
        <ProfileForm fullName={profile.full_name} phone={profile.phone} />
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
