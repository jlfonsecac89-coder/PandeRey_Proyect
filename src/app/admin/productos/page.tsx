import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { CatalogoTabs } from "@/components/admin/CatalogoTabs";
import { ProductDrawer } from "@/components/admin/ProductDrawer";
import { DrawerSection } from "@/components/admin/DrawerSection";
import { ProductoForm } from "./ProductoForm";
import { ProductoEditForm } from "./ProductoEditForm";
import { ImagenesSection } from "./ImagenesSection";
import { VariantesSection } from "./VariantesSection";
import { StockSection } from "./StockSection";
import { ProductosTable } from "@/components/admin/ProductosTable";

type SearchParams = { nuevo?: string; editar?: string };

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const profile = await requireRole(["admin", "operaciones"], "/admin-login");
  const { nuevo, editar } = await searchParams;

  const supabase = await createClient();
  const [{ data: products }, { data: categories }, { data: collections }, { data: departments }, { data: allImages }, { data: allBatches }] =
    await Promise.all([
      supabase
        .from("products")
        .select(
          "id, name, sku, price, is_active, is_special_event, category:categories(id, name, department:departments(id, name))",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("categories")
        .select("id, name, department:departments(name)")
        .order("name"),
      supabase.from("collections").select("id, name").order("name"),
      supabase.from("departments").select("id, name").eq("is_active", true).order("sort_order"),
      supabase.from("product_images").select("product_id"),
      supabase.from("product_batches").select("product_id"),
    ]);

  // Para poder filtrar "sin fotos" / "sin stock" en la tabla — típicamente
  // productos que entraron por carga masiva (CSV) y todavía no tienen fotos
  // ni lotes cargados, porque esos dos no vienen en el CSV.
  const productIdsWithImages = new Set((allImages ?? []).map((i) => i.product_id));
  const productIdsWithStock = new Set((allBatches ?? []).map((b) => b.product_id));

  type ProductRow = {
    id: string;
    name: string;
    sku: string;
    price: number;
    is_active: boolean;
    is_special_event: boolean;
    category: { id: string; name: string; department: { id: string; name: string } | { id: string; name: string }[] | null } | { id: string; name: string; department: { id: string; name: string } | { id: string; name: string }[] | null }[] | null;
  };

  const normalized = ((products ?? []) as ProductRow[]).map((p) => {
    const cat = Array.isArray(p.category) ? p.category[0] : p.category;
    const dept = cat ? (Array.isArray(cat.department) ? cat.department[0] : cat.department) : null;
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: p.price,
      is_active: p.is_active,
      is_special_event: p.is_special_event,
      categoryId: cat?.id ?? null,
      categoryName: cat?.name ?? null,
      departmentId: dept?.id ?? null,
      departmentName: dept?.name ?? null,
      hasPhotos: productIdsWithImages.has(p.id),
      hasStock: productIdsWithStock.has(p.id),
    };
  });

  const total = normalized.length;
  const activos = normalized.filter((p) => p.is_active).length;
  const inactivos = total - activos;
  const edicionLimitada = normalized.filter((p) => p.is_special_event).length;

  // Datos del producto en edición — se cargan solo cuando el drawer está en
  // modo "editar" (?editar=<id>), nunca en la carga normal de la lista.
  let editData: {
    product: {
      id: string;
      name: string;
      description: string | null;
      price: number;
      is_gluten_free: boolean;
      is_active: boolean;
      sku: string;
      category_id: string | null;
      is_special_event: boolean;
      event_collection_id: string | null;
      max_orders: number | null;
      requires_production_notes: boolean;
    };
    images: { id: string; storage_path: string }[];
    groups: { id: string; name: string; selection_type: string; values: { id: string; name: string; price_delta: number }[] }[];
    stores: { id: string; name: string }[];
    batches: {
      id: string;
      quantity: number;
      expiration_date: string | null;
      is_clearance: boolean;
      clearance_discount_percent: number | null;
      store: { name: string } | { name: string }[];
    }[];
  } | null = null;

  // Catálogo de variantes ya usadas en OTROS productos — para que crear un
  // grupo/valor sea elegir de lo que ya existe (con su selection_type y sus
  // valores típicos) en vez de reescribirlo a mano y terminar con "Relleno",
  // "relleno" y "RELLENO" como tres grupos distintos por producto.
  let variantCatalog: { name: string; selectionType: string; values: { name: string; priceDelta: number }[] }[] = [];

  if (editar) {
    const [
      { data: product },
      { data: images },
      { data: groups },
      { data: stores },
      { data: batches },
      { data: allGroups },
    ] = await Promise.all([
      supabase
        .from("products")
        .select(
          "id, name, description, price, sku, is_gluten_free, is_active, category_id, is_special_event, event_collection_id, max_orders, requires_production_notes",
        )
        .eq("id", editar)
        .maybeSingle(),
      supabase.from("product_images").select("id, storage_path").eq("product_id", editar).order("sort_order"),
      supabase
        .from("product_option_groups")
        .select("id, name, selection_type, values:product_option_values(id, name, price_delta)")
        .eq("product_id", editar)
        .order("sort_order"),
      supabase.from("stores").select("id, name").eq("is_active", true).order("name"),
      supabase
        .from("product_batches")
        .select("id, quantity, expiration_date, is_clearance, clearance_discount_percent, store:stores(name)")
        .eq("product_id", editar)
        .order("expiration_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("product_option_groups")
        .select("name, selection_type, values:product_option_values(name, price_delta)"),
    ]);

    if (product) {
      editData = {
        product,
        images: images ?? [],
        groups: (groups ?? []) as NonNullable<typeof editData>["groups"],
        stores: stores ?? [],
        batches: (batches ?? []) as NonNullable<typeof editData>["batches"],
      };
    }

    const byName = new Map<string, { name: string; selectionType: string; values: Map<string, number> }>();
    for (const g of (allGroups ?? []) as { name: string; selection_type: string; values: { name: string; price_delta: number }[] }[]) {
      const key = g.name.trim().toLowerCase();
      if (!byName.has(key)) byName.set(key, { name: g.name.trim(), selectionType: g.selection_type, values: new Map() });
      const entry = byName.get(key)!;
      for (const v of g.values) {
        entry.values.set(v.name.trim(), v.price_delta);
      }
    }
    variantCatalog = [...byName.values()]
      .map((g) => ({
        name: g.name,
        selectionType: g.selectionType,
        values: [...g.values.entries()].map(([name, priceDelta]) => ({ name, priceDelta })),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  const publicBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images`;
  const clearanceAlertDays = Number(process.env.CLEARANCE_ALERT_DAYS_BEFORE_EXPIRY ?? 3);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Producto y categorías</p>
        <div className="mt-1 flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-medium text-foreground">Productos</h1>
            <p className="mt-1 text-sm text-foreground-muted">
              El SKU se genera automáticamente — nunca se escribe a mano.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/productos/importar"
              className="rounded-md border border-charcoal-border px-3 py-1.5 text-sm text-foreground-muted transition hover:border-gold-dark hover:text-gold"
            >
              Carga masiva
            </Link>
            <Link
              href="/admin/productos?nuevo=1"
              className="rounded-md bg-gold px-3 py-1.5 text-sm font-medium text-ink hover:bg-gold-hover"
            >
              + Nuevo producto
            </Link>
          </div>
        </div>
      </div>

      <CatalogoTabs active="productos" role={profile.role} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
          <p className="text-xs uppercase tracking-wide text-foreground-muted">Total</p>
          <p className="mt-1.5 font-display text-2xl font-medium text-foreground">{total}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
          <p className="text-xs uppercase tracking-wide text-foreground-muted">Activos</p>
          <p className="mt-1.5 font-display text-2xl font-medium text-gold">{activos}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
          <p className="text-xs uppercase tracking-wide text-foreground-muted">Inactivos</p>
          <p className="mt-1.5 font-display text-2xl font-medium text-foreground">{inactivos}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
          <p className="text-xs uppercase tracking-wide text-foreground-muted">Edición limitada</p>
          <p className="mt-1.5 font-display text-2xl font-medium text-foreground">{edicionLimitada}</p>
        </div>
      </div>

      <ProductosTable products={normalized} departments={departments ?? []} />

      {nuevo === "1" && (
        <ProductDrawer title="Nuevo producto">
          <ProductoForm categories={categories ?? []} collections={collections ?? []} />
        </ProductDrawer>
      )}

      {editar && editData && (
        <ProductDrawer title={`Editar — ${editData.product.name}`}>
          <div className="space-y-4">
            <p className="font-mono text-xs text-gold-dark">{editData.product.sku}</p>

            <DrawerSection title="Datos generales" defaultOpen>
              <ProductoEditForm
                product={editData.product}
                categories={categories ?? []}
                collections={collections ?? []}
              />
            </DrawerSection>

            <DrawerSection title="Fotos" count={editData.images.length}>
              <ImagenesSection productId={editar} images={editData.images} publicBaseUrl={publicBaseUrl} />
            </DrawerSection>

            <DrawerSection title="Variantes" count={editData.groups.length}>
              <VariantesSection productId={editar} groups={editData.groups} catalog={variantCatalog} />
            </DrawerSection>

            <DrawerSection title="Stock" count={editData.batches.length}>
              <StockSection
                productId={editar}
                stores={editData.stores}
                batches={editData.batches}
                clearanceAlertDays={clearanceAlertDays}
              />
            </DrawerSection>
          </div>
        </ProductDrawer>
      )}
    </div>
  );
}
