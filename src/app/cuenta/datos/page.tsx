import { getCurrentProfile } from "@/lib/auth/session";
import { ProfileForm } from "./ProfileForm";
import { DeleteAccountForm } from "./DeleteAccountForm";

export default async function DatosPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  return (
    <div>
      <h1 className="text-xl font-semibold text-gold">Mis datos</h1>
      <div className="mt-4">
        <ProfileForm fullName={profile.full_name} phone={profile.phone} />
      </div>

      <div className="mt-10 border-t border-charcoal-border pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">Zona de riesgo</h2>
        <div className="mt-3">
          <DeleteAccountForm />
        </div>
      </div>
    </div>
  );
}
