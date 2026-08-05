import { getCurrentProfile } from "@/lib/auth/session";
import { ProfileForm } from "./ProfileForm";

export default async function DatosPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  return (
    <div>
      <h1 className="text-xl font-semibold text-gold">Mis datos</h1>
      <div className="mt-4">
        <ProfileForm fullName={profile.full_name} phone={profile.phone} />
      </div>
    </div>
  );
}
