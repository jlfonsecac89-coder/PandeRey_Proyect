import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { StoreCard } from "@/components/admin/StoreCard";
import { NewStoreForm } from "@/components/admin/NewStoreForm";

export default async function SucursalesPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();

  const [{ data: stores }, { data: zones }] = await Promise.all([
    supabase
      .from("stores")
      .select(
        "id, name, contact_address, contact_phone, contact_email, social_links, max_delivery_radius_km, min_order_amount, free_shipping_min_amount, is_active",
      )
      .order("name"),
    supabase
      .from("shipping_zones")
      .select("id, store_id, min_km, max_km, price, is_active")
      .order("min_km"),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gold">Sucursales</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Radio de entrega, mínimo de compra, envío gratis y tramos de envío por
          sucursal — módulo exclusivo de Admin (sección 09 del blueprint).
        </p>
      </div>

      <div className="space-y-4">
        {(stores ?? []).map((store) => (
          <StoreCard
            key={store.id}
            store={store}
            zones={(zones ?? []).filter((z) => z.store_id === store.id)}
          />
        ))}
      </div>

      <NewStoreForm />
    </div>
  );
}
