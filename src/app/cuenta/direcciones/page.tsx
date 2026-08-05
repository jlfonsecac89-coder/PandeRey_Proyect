import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AddressManager } from "./AddressManager";

export default async function DireccionesPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const { data: addresses } = await supabase
    .from("addresses")
    .select("id, label, calle, numero, comuna, ciudad, region")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-xl font-semibold text-gold">Mis direcciones</h1>
      <div className="mt-4">
        <AddressManager addresses={addresses ?? []} />
      </div>
    </div>
  );
}
