import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getClearanceDiscounts, getClearanceProductIds, applyClearanceDiscount } from "@/lib/catalog/clearance";
import { SortSelect } from "@/components/storefront/SortSelect";
import { TiendaSidebarLayout } from "@/components/storefront/TiendaSidebarLayout";
import { ProductGridCard, type ProductGridCardData } from "@/components/storefront/ProductGridCard";

type ProductImage = { storage_path: string; sort_order: number };
type ProductRow = {
  id: string;
  name: string;
  slug: string;
  price: number;
  is_gluten_free: boolean;
  is_special_event: boolean;
  images: ProductImage[];
  option_groups: { is_required: boolean }[];
};

type SearchParams = {
  departamento?: string;
  categoria?: string;
  filtro?: string;
  precio?: string;
  singluten?: string;
  orden?: string;
};

const PRICE_BUCKETS = [
  { key: "0-1500", label: "Hasta $1.500", min: 0, max: 1500 },
  { key: "1500-3000", label: "$1.500 – $3.000", min: 1500, max: 3000 },
  { key: "3000-10000", label: "$3.000 – $10.000", min: 3000, max: 10000 },
  { key: "10000-", label: "Más de $10.000", min: 10000, max: null as number | null },
];

const SORT_OPTIONS = [
  { key: "recientes", label: "Más recientes" },
  { key: "nombre", label: "Nombre A-Z" },
  { key: "precio_asc", label: "Precio: menor a mayor" },
  { key: "precio_desc", label: "Precio: mayor a menor" },
];

function firstImagePath(images: ProductImage[]): string | null {
  if (!images.length) return null;
  return [...images].sort((a, b) => a.sort_order - b.sort_order)[0].storage_path;
}

async function resolveOfferedProductIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Set<string> | null> {
  const nowIso = new Date().toISOString();
  const { data: promos } = await supabase
    .from("promotions")
    .select("product_id, category_id, department_id")
    .is("code", null)
    .eq("is_active", true)
    .lte("starts_at", nowIso)
    .gte("ends_at", nowIso);

  if (!promos || promos.length === 0) return new Set();

  const productIds = new Set<string>();
  const categoryIds = new Set<string>();
  const departmentIds = new Set<string>();
  let cartWide = false;

  for (const p of promos) {
    if (p.product_id) productIds.add(p.product_id);
    else if (p.category_id) categoryIds.add(p.category_id);
    else if (p.department_id) departmentIds.add(p.department_id);
    else cartWide = true;
  }

  if (cartWide) return null; // null = "todo el catálogo tiene alguna oferta aplicable"

  if (categoryIds.size > 0) {
    const { data: catProducts } = await supabase
      .from("products")
      .select("id")
      .in("category_id", [...categoryIds]);
    for (const p of catProducts ?? []) productIds.add(p.id);
  }
  if (departmentIds.size > 0) {
    const { data: cats } = await supabase
      .from("categories")
      .select("id")
      .in("department_id", [...departmentIds]);
    const catIds = (cats ?? []).map((c) => c.id);
    if (catIds.length > 0) {
      const { data: deptProducts } = await supabase.from("products").select("id").in("category_id", catIds);
      for (const p of deptProducts ?? []) productIds.add(p.id);
    }
  }

  return productIds;
}

export default async function TiendaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { departamento, categoria, filtro, precio, singluten, orden } = await searchParams;
  const supabase = await createClient();

  const { data: activeStore } = await supabase
    .from("stores")
    .select("id")
    .eq("is_active", true)
    .order("name")
    .limit(1)
    .maybeSingle();
  const storeId = activeStore?.id ?? null;

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("sort_order");

  const currentDept = departamento ? (departments ?? []).find((d) => d.slug === departamento) : null;

  let categoriesInDept: { id: string; name: string; slug: string }[] = [];
  if (currentDept) {
    const { data: cats } = await supabase
      .from("categories")
      .select("id, name, slug")
      .eq("department_id", currentDept.id)
      .eq("is_active", true)
      .order("sort_order");
    categoriesInDept = cats ?? [];
  }

  let categoryIds: string[] | null = null;
  if (categoria && currentDept) {
    const cat = categoriesInDept.find((c) => c.slug === categoria);
    categoryIds = cat ? [cat.id] : [];
  } else if (currentDept) {
    categoryIds = categoriesInDept.map((c) => c.id);
  }

  let query = supabase
    .from("products")
    .select(
      "id, name, slug, price, is_gluten_free, is_special_event, images:product_images(storage_path, sort_order), option_groups:product_option_groups(is_required)",
    )
    .eq("is_active", true);

  if (orden === "precio_asc") query = query.order("price", { ascending: true });
  else if (orden === "precio_desc") query = query.order("price", { ascending: false });
  else if (orden === "recientes") query = query.order("created_at", { ascending: false });
  else query = query.order("name", { ascending: true });

  if (categoryIds) {
    query = query.in("category_id", categoryIds.length ? categoryIds : ["00000000-0000-0000-0000-000000000000"]);
  }
  if (filtro === "evento") {
    query = query.eq("is_special_event", true);
  }
  if (singluten === "1") {
    query = query.eq("is_gluten_free", true);
  }
  const activeBucket = PRICE_BUCKETS.find((b) => b.key === precio);
  if (activeBucket) {
    query = query.gte("price", activeBucket.min);
    if (activeBucket.max !== null) query = query.lt("price", activeBucket.max);
  }

  let offeredIds: Set<string> | null = null;
  if (filtro === "ofertas") {
    const [promoIds, clearanceIds] = await Promise.all([
      resolveOfferedProductIds(supabase),
      getClearanceProductIds(supabase, storeId),
    ]);
    // null = "todo el catálogo tiene alguna oferta aplicable" (cupón cart-wide);
    // igual se unen los productos en liquidación por si el cupón no cubriera todo.
    offeredIds = promoIds === null ? null : new Set([...promoIds, ...clearanceIds]);
    if (offeredIds) {
      query = query.in("id", offeredIds.size ? [...offeredIds] : ["00000000-0000-0000-0000-000000000000"]);
    }
  }

  const { data: products } = await query;

  const clearanceDiscounts = await getClearanceDiscounts(
    supabase,
    storeId ?? "",
    (products ?? []).map((p) => p.id),
  );

  const publicBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images`;

  function buildHref(overrides: Partial<SearchParams>) {
    const current: SearchParams = { departamento, categoria, filtro, precio, singluten, orden };
    const merged = { ...current, ...overrides };
    const params = new URLSearchParams();
    if (merged.departamento) params.set("departamento", merged.departamento);
    if (merged.categoria) params.set("categoria", merged.categoria);
    if (merged.filtro) params.set("filtro", merged.filtro);
    if (merged.precio) params.set("precio", merged.precio);
    if (merged.singluten) params.set("singluten", merged.singluten);
    if (merged.orden) params.set("orden", merged.orden);
    const qs = params.toString();
    return qs ? `/tienda?${qs}` : "/tienda";
  }

  const activeFilterCount =
    (departamento ? 1 : 0) +
    (filtro ? 1 : 0) +
    (precio ? 1 : 0) +
    (singluten ? 1 : 0);

  const gridProducts: ProductGridCardData[] = (products as ProductRow[] | null ?? []).map((product) => {
    const clearancePct = clearanceDiscounts.get(product.id);
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      discountedPrice: applyClearanceDiscount(product.price, clearancePct),
      clearancePct,
      isGlutenFree: product.is_gluten_free,
      isSpecialEvent: product.is_special_event,
      imagePath: firstImagePath(product.images),
      canQuickAdd: !product.option_groups.some((g) => g.is_required),
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">Catálogo</p>
      <h1 className="mt-1 font-display text-3xl font-medium text-foreground">Tienda</h1>

      {/* Pills de departamento — atajo horizontal a lo mismo que ya existe
          en el sidebar ("Departamento"), calcado del filtro por categorías
          de la referencia (íconos + pill dorada cuando está activa). */}
      <div className="mt-6 -mx-6 flex gap-3 overflow-x-auto px-6 pb-2 [mask-image:linear-gradient(to_right,white_92%,transparent_100%)]">
        <Link
          href={buildHref({ departamento: undefined, categoria: undefined })}
          className={`shrink-0 whitespace-nowrap rounded-full px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em] transition-all duration-300 ${
            !departamento
              ? "bg-gold text-ink shadow-[0_4px_20px_rgba(212,175,55,0.25)]"
              : "border border-white/5 bg-background-alt/60 text-foreground-muted hover:text-foreground"
          }`}
        >
          Todas
        </Link>
        {(departments ?? []).map((d) => (
          <Link
            key={d.id}
            href={buildHref({ departamento: d.slug, categoria: undefined })}
            className={`shrink-0 whitespace-nowrap rounded-full px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em] transition-all duration-300 ${
              departamento === d.slug
                ? "bg-gold text-ink shadow-[0_4px_20px_rgba(212,175,55,0.25)]"
                : "border border-white/5 bg-background-alt/60 text-foreground-muted hover:text-foreground"
            }`}
          >
            {d.name}
          </Link>
        ))}
      </div>

      <TiendaSidebarLayout
        sidebar={
        <aside className="space-y-6 rounded-2xl border border-white/5 bg-background-alt/60 p-5 backdrop-blur-sm lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Filtros</p>
            {activeFilterCount > 0 && (
              <Link href="/tienda" className="text-xs text-gold-hover hover:underline">
                Limpiar
              </Link>
            )}
          </div>

          {currentDept && categoriesInDept.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Categoría</p>
              <ul className="mt-2 space-y-1">
                <li>
                  <Link
                    href={buildHref({ categoria: undefined })}
                    className={`block rounded-md px-2 py-1 text-sm transition ${
                      !categoria ? "bg-gold/10 font-medium text-gold" : "text-foreground-muted hover:text-gold"
                    }`}
                  >
                    Todas las categorías
                  </Link>
                </li>
                {categoriesInDept.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={buildHref({ categoria: c.slug })}
                      className={`block rounded-md px-2 py-1 text-sm transition ${
                        categoria === c.slug
                          ? "bg-gold/10 font-medium text-gold"
                          : "text-foreground-muted hover:text-gold"
                      }`}
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-t border-white/5 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Precio</p>
            <ul className="mt-2 space-y-1">
              <li>
                <Link
                  href={buildHref({ precio: undefined })}
                  className={`block rounded-md px-2 py-1 text-sm transition ${
                    !precio ? "bg-gold/10 font-medium text-gold" : "text-foreground-muted hover:text-gold"
                  }`}
                >
                  Todos los precios
                </Link>
              </li>
              {PRICE_BUCKETS.map((b) => (
                <li key={b.key}>
                  <Link
                    href={buildHref({ precio: precio === b.key ? undefined : b.key })}
                    className={`block rounded-md px-2 py-1 text-sm transition ${
                      precio === b.key ? "bg-gold/10 font-medium text-gold" : "text-foreground-muted hover:text-gold"
                    }`}
                  >
                    {b.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-1 border-t border-white/5 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">Otros</p>
            <Link
              href={buildHref({ filtro: filtro === "ofertas" ? undefined : "ofertas" })}
              className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm transition ${
                filtro === "ofertas" ? "bg-burgundy/10 font-medium text-burgundy-hover" : "text-foreground-muted hover:text-gold"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded border ${filtro === "ofertas" ? "border-burgundy bg-burgundy" : "border-white/15"}`}
              >
                {filtro === "ofertas" && <span className="h-2 w-2 rounded-sm bg-white" />}
              </span>
              Ofertas
            </Link>
            <Link
              href={buildHref({ filtro: filtro === "evento" ? undefined : "evento" })}
              className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm transition ${
                filtro === "evento" ? "bg-gold/10 font-medium text-gold" : "text-foreground-muted hover:text-gold"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded border ${filtro === "evento" ? "border-gold bg-gold" : "border-white/15"}`}
              >
                {filtro === "evento" && <span className="h-2 w-2 rounded-sm bg-ink" />}
              </span>
              Edición limitada
            </Link>
            <Link
              href={buildHref({ singluten: singluten === "1" ? undefined : "1" })}
              className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm transition ${
                singluten === "1" ? "bg-gold/10 font-medium text-gold" : "text-foreground-muted hover:text-gold"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded border ${singluten === "1" ? "border-gold bg-gold" : "border-white/15"}`}
              >
                {singluten === "1" && <span className="h-2 w-2 rounded-sm bg-ink" />}
              </span>
              Sin gluten
            </Link>
          </div>
        </aside>
        }
      >
        {/* Resultados */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-foreground-muted">
              {gridProducts.length} producto{gridProducts.length === 1 ? "" : "s"} encontrado
              {gridProducts.length === 1 ? "" : "s"}
            </p>
            <SortSelect
              current={orden ?? "nombre"}
              options={SORT_OPTIONS}
              currentParams={{ departamento, categoria, filtro, precio, singluten }}
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {gridProducts.map((product) => (
              <ProductGridCard key={product.id} product={product} publicBaseUrl={publicBaseUrl} />
            ))}
            {gridProducts.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-white/10 py-16 text-center">
                <p className="text-sm text-foreground-muted">No hay productos que coincidan con este filtro.</p>
              </div>
            )}
          </div>
        </div>
      </TiendaSidebarLayout>
    </div>
  );
}
