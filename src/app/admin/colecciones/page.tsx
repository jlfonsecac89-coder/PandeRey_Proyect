import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { CatalogoTabs } from "@/components/admin/CatalogoTabs";
import { collectionStatus, isoToChileLocal } from "@/lib/catalog/collections";
import { ColeccionForm } from "./ColeccionForm";
import { ColeccionCard, type ColeccionView } from "./ColeccionCard";

export default async function ColeccionesPage() {
  const profile = await requireRole(["admin", "marketing"], "/admin-login");

  const supabase = await createClient();
  const [{ data: collections }, { data: products }, { data: links }] = await Promise.all([
    supabase.from("collections").select("id, name, slug, starts_at, ends_at, is_active").order("name"),
    supabase.from("products").select("id, name, is_active").order("name"),
    supabase.from("product_collections").select("collection_id, product_id"),
  ]);

  const productsByCollection = new Map<string, string[]>();
  for (const l of links ?? []) {
    const list = productsByCollection.get(l.collection_id) ?? [];
    list.push(l.product_id);
    productsByCollection.set(l.collection_id, list);
  }

  const views: ColeccionView[] = (collections ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    isActive: c.is_active,
    status: collectionStatus(c),
    startsAt: isoToChileLocal(c.starts_at),
    endsAt: isoToChileLocal(c.ends_at),
    productIds: productsByCollection.get(c.id) ?? [],
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Producto y categorías</p>
        <h1 className="mt-1 font-display text-2xl font-medium text-foreground">Colecciones</h1>
      </div>
      <CatalogoTabs active="colecciones" role={profile.role} />
      <p className="text-sm text-foreground-muted">
        Vitrinas transversales (Sin Gluten, Para Compartir, Navidad...). Un producto puede estar en varias a la vez.
        Las colecciones activas y vigentes aparecen como filtro en la tienda.
      </p>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
        <ColeccionForm />
      </div>

      <div className="space-y-4">
        {views.map((c) => (
          <ColeccionCard key={c.id} collection={c} products={products ?? []} />
        ))}
        {views.length === 0 && <p className="text-sm text-foreground-muted">Todavía no hay colecciones.</p>}
      </div>
    </div>
  );
}
