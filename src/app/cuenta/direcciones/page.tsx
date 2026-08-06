import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AddressManager } from "./AddressManager";

export default async function DireccionesPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const { data: addresses } = await supabase
    .from("addresses")
    .select("id, label, calle, numero, comuna, ciudad, region, housing_type, depto_numero")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">Envíos</p>
      <h1 className="mt-1 font-display text-2xl font-medium text-foreground">Mis direcciones</h1>
      <div className="mt-4">
        <AddressManager addresses={addresses ?? []} />
      </div>
    </div>
  );
}
