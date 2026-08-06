import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCLP } from "@/lib/format";
import { getClearanceDiscounts, getClearanceProductIds, applyClearanceDiscount } from "@/lib/catalog/clearance";
import { DepartmentIcon } from "@/components/storefront/DepartmentIcon";

type ProductImage = { storage_path: string; sort_order: number };
type ProductRow = {
  id: string;
  name: string;
  slug: string;
  price: number;
  is_gluten_free: boolean;
  is_special_event: boolean;
  images: ProductImage[];
};

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

export default async function TiendaPage({
  searchParams,
}: {
  searchParams: Promise<{ departamento?: string; categoria?: string; filtro?: string }>;
}) {
  const { departamento, categoria, filtro } = await searchParams;
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
      "id, name, slug, price, is_gluten_free, is_special_event, images:product_images(storage_path, sort_order)",
    )
    .eq("is_active", true)
    .order("name");

  if (categoryIds) {
    query = query.in("category_id", categoryIds.length ? categoryIds : ["00000000-0000-0000-0000-000000000000"]);
  }
  if (filtro === "evento") {
    query = query.eq("is_special_event", true);
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

  function buildHref(overrides: { departamento?: string | null; categoria?: string | null; filtro?: string | null }) {
    const params = new URLSearchParams();
    const dept = overrides.departamento !== undefined ? overrides.departamento : departamento;
    const cat = overrides.categoria !== undefined ? overrides.categoria : categoria;
    const filt = overrides.filtro !== undefined ? overrides.filtro : filtro;
    if (dept) params.set("departamento", dept);
    if (cat) params.set("categoria", cat);
    if (filt) params.set("filtro", filt);
    const qs = params.toString();
    return qs ? `/tienda?${qs}` : "/tienda";
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">Catálogo</p>
      <h1 className="mt-1 font-display text-3xl font-medium text-foreground">Tienda</h1>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href={buildHref({ departamento: null, categoria: null })}
          className={`rounded-full border px-3.5 py-1.5 text-xs transition ${
            !departamento
              ? "border-gold bg-gold/10 text-gold"
              : "border-charcoal-border text-foreground-muted hover:border-gold-dark hover:text-gold"
          }`}
        >
          Todo
        </Link>
        {(departments ?? []).map((d) => (
          <Link
            key={d.id}
            href={buildHref({ departamento: d.slug, categoria: null })}
            className={`rounded-full border px-3.5 py-1.5 text-xs transition ${
              departamento === d.slug
                ? "border-gold bg-gold/10 text-gold"
                : "border-charcoal-border text-foreground-muted hover:border-gold-dark hover:text-gold"
            }`}
          >
            {d.name}
          </Link>
        ))}
      </div>

      {currentDept && categoriesInDept.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            href={buildHref({ categoria: null })}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              !categoria
                ? "border-gold-dark text-gold-hover"
                : "border-charcoal-border text-foreground-muted/70 hover:text-gold"
            }`}
          >
            Todas las categorías
          </Link>
          {categoriesInDept.map((c) => (
            <Link
              key={c.id}
              href={buildHref({ categoria: c.slug })}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                categoria === c.slug
                  ? "border-gold-dark text-gold-hover"
                  : "border-charcoal-border text-foreground-muted/70 hover:text-gold"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        <Link
          href={buildHref({ filtro: filtro === "ofertas" ? null : "ofertas" })}
          className={`rounded-full border px-3.5 py-1.5 text-xs transition ${
            filtro === "ofertas"
              ? "border-burgundy bg-burgundy/15 text-burgundy-hover"
              : "border-charcoal-border text-foreground-muted hover:border-gold-dark hover:text-gold"
          }`}
        >
          Ofertas
        </Link>
        <Link
          href={buildHref({ filtro: filtro === "evento" ? null : "evento" })}
          className={`rounded-full border px-3.5 py-1.5 text-xs transition ${
            filtro === "evento"
              ? "border-gold bg-gold/10 text-gold"
              : "border-charcoal-border text-foreground-muted hover:border-gold-dark hover:text-gold"
          }`}
        >
          Edición limitada
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {(products as ProductRow[] | null ?? []).map((product) => {
          const imagePath = firstImagePath(product.images);
          const clearancePct = clearanceDiscounts.get(product.id);
          const discountedPrice = applyClearanceDiscount(product.price, clearancePct);
          return (
            <Link
              key={product.id}
              href={`/tienda/${product.slug}`}
              className="group overflow-hidden rounded-xl border border-charcoal-border bg-background-elevated shadow-card transition hover:-translate-y-0.5 hover:border-gold-dark"
            >
              <div className="relative aspect-square overflow-hidden bg-background">
                {imagePath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${publicBaseUrl}/${imagePath}`}
                    alt={product.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-foreground-muted/25">
                    <DepartmentIcon name="" className="h-10 w-10" />
                  </div>
                )}
                <div className="absolute left-2 top-2 flex flex-col gap-1">
                  {clearancePct && (
                    <span className="rounded-full bg-burgundy px-2 py-0.5 text-[10px] font-medium text-foreground shadow-card">
                      -{clearancePct}%
                    </span>
                  )}
                  {product.is_special_event && (
                    <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-medium text-background shadow-card">
                      Edición limitada
                    </span>
                  )}
                </div>
              </div>
              <div className="p-3.5">
                <p className="text-sm text-foreground">{product.name}</p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  {clearancePct ? (
                    <p className="text-sm font-semibold text-gold">
                      {formatCLP(discountedPrice)}{" "}
                      <span className="text-xs font-normal text-foreground-muted/60 line-through">
                        {formatCLP(product.price)}
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm font-semibold text-gold">{formatCLP(product.price)}</p>
                  )}
                  {product.is_gluten_free && (
                    <span className="shrink-0 rounded-full border border-charcoal-border px-2 py-0.5 text-[10px] text-foreground-muted">
                      Sin gluten
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
        {(products ?? []).length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-charcoal-border py-16 text-center">
            <p className="text-sm text-foreground-muted">No hay productos que coincidan con este filtro.</p>
          </div>
        )}
      </div>
    </div>
  );
}
