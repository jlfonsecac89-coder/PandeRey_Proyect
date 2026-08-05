import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { BannersSection } from "./BannerForm";

export default async function BannersPage() {
  await requireRole(["admin", "marketing"]);
  const supabase = await createClient();

  const { data: banners } = await supabase
    .from("banners")
    .select("id, title, subtitle, link_url, image_storage_path, is_active")
    .order("sort_order");

  const publicBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/banners`;

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold text-gold">Banners de la landing</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Solo se muestran en la portada los banners activos (y dentro de su rango de
        fechas, si tienen uno).
      </p>
      <div className="mt-4">
        <BannersSection banners={banners ?? []} publicBaseUrl={publicBaseUrl} />
      </div>
    </div>
  );
}
