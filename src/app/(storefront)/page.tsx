import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCLP } from "@/lib/format";
import { renderStars } from "@/lib/reviews/stars";
import { BannerCarousel } from "@/components/storefront/BannerCarousel";
import { NewsletterForm } from "@/components/storefront/NewsletterForm";
import { DepartmentIcon } from "@/components/storefront/DepartmentIcon";
import { SocialIcons } from "@/components/storefront/SocialIcons";

type ProductImage = { storage_path: string; sort_order: number };
type ProductCard = {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: ProductImage[];
};

function firstImagePath(images: ProductImage[]): string | null {
  if (!images.length) return null;
  return [...images].sort((a, b) => a.sort_order - b.sort_order)[0].storage_path;
}

export default async function Home() {
  const supabase = await createClient();

  const [{ data: banners }, { data: bestSellerIds }, { data: store }, { data: departments }, { data: reviews }] =
    await Promise.all([
      supabase
        .from("banners")
        .select("id, title, subtitle, link_url, image_storage_path")
        .eq("is_active", true)
        .order("sort_order"),
      supabase.rpc("get_best_selling_product_ids", { days: 30, limit_count: 8 }),
      supabase
        .from("stores")
        .select("name, contact_address, contact_phone, contact_email, business_hours, social_links")
        .eq("is_active", true)
        .order("name")
        .limit(1)
        .maybeSingle(),
      supabase.from("departments").select("id, name, slug").eq("is_active", true).order("sort_order"),
      supabase
        .from("product_reviews")
        .select("rating, comment, product:products(name, slug)")
        .eq("status", "approved"),
    ]);

  const bestSellerProductIds = (bestSellerIds ?? []).map((r: { product_id: string }) => r.product_id);
  let bestSellers: ProductCard[] = [];
  if (bestSellerProductIds.length > 0) {
    const { data } = await supabase
      .from("products")
      .select("id, name, slug, price, images:product_images(storage_path, sort_order)")
      .in("id", bestSellerProductIds)
      .eq("is_active", true);
    // El orden de "más vendido" se pierde en el .in() — se reordena según bestSellerProductIds.
    const byId = new Map((data ?? []).map((p) => [p.id, p as ProductCard]));
    bestSellers = bestSellerProductIds
      .map((id: string) => byId.get(id))
      .filter((p: ProductCard | undefined): p is ProductCard => !!p);
  }

  // "Mejores valorados": promedio + reseña más reciente por producto, entre
  // los que tienen al menos una reseña aprobada — se calcula acá porque el
  // volumen de reseñas de una panadería es chico, no justifica una vista
  // materializada.
  type ReviewRow = { rating: number; comment: string | null; product: { name: string; slug: string } | { name: string; slug: string }[] | null };
  const byProduct = new Map<string, { name: string; slug: string; ratings: number[]; comment: string | null }>();
  for (const r of (reviews as ReviewRow[] | null) ?? []) {
    const product = Array.isArray(r.product) ? r.product[0] : r.product;
    if (!product) continue;
    const entry = byProduct.get(product.slug) ?? { name: product.name, slug: product.slug, ratings: [], comment: null };
    entry.ratings.push(r.rating);
    if (r.comment && !entry.comment) entry.comment = r.comment;
    byProduct.set(product.slug, entry);
  }
  const topRated = [...byProduct.values()]
    .map((p) => ({ ...p, avg: p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length }))
    .sort((a, b) => b.avg - a.avg || b.ratings.length - a.ratings.length)
    .slice(0, 3);

  const publicBannerBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/banners`;
  const publicProductBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images`;

  return (
    <div className="space-y-24 pb-24">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, color-mix(in srgb, var(--color-gold) 16%, transparent), transparent 70%)",
          }}
        />
        <div className="relative flex flex-col items-center justify-center gap-5 px-6 pb-6 pt-20 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-gold-dark">Panadería · Pastelería · Cafetería</p>
          <h1 className="max-w-2xl font-display text-5xl font-medium leading-[1.1] text-foreground sm:text-6xl">
            Horneado con oficio,
            <br />
            <span className="text-gold">todos los días</span>
          </h1>
          <p className="max-w-md text-[15px] leading-relaxed text-foreground-muted">
            Pan, pastelería y café de elaboración artesanal — pedí online con retiro en tienda o despacho a
            domicilio.
          </p>
          <div className="mt-3 flex gap-3">
            <Link
              href="/tienda"
              className="rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-background shadow-card transition hover:bg-gold-hover"
            >
              Ver la tienda
            </Link>
            <a
              href="#visitanos"
              className="rounded-full border border-charcoal-border px-6 py-2.5 text-sm text-foreground-muted transition hover:border-gold-dark hover:text-gold"
            >
              Visítanos
            </a>
          </div>
        </div>
      </div>

      {banners && banners.length > 0 && (
        <BannerCarousel banners={banners} publicBaseUrl={publicBannerBaseUrl} />
      )}

      {/* Historia */}
      <section className="mx-auto max-w-3xl px-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">Nuestra historia</p>
        <h2 className="mt-2 font-display text-3xl font-medium text-foreground">Hecho a mano, todos los días</h2>
        <div className="mx-auto mt-4 h-px w-12 bg-gold-dark/60" />
        <p className="mt-6 text-[15px] leading-relaxed text-foreground-muted">
          En {store?.name ?? "Pan de Rey"} amasamos, horneamos y decoramos cada producto en nuestro propio obrador —
          sin atajos industriales. Empezamos con pan del día para el barrio y fuimos sumando pastelería y café a
          medida que nuestros vecinos nos lo pedían. Seguimos siendo el mismo taller artesanal de siempre: masas de
          fermentación lenta, relleno y coberturas a elección, y tortas hechas a pedido para cada celebración.
        </p>
      </section>

      {/* Especialidades por departamento */}
      {departments && departments.length > 0 && (
        <section className="mx-auto max-w-5xl px-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">Especialidades</p>
            <h2 className="mt-2 font-display text-3xl font-medium text-foreground">Lo que hacemos mejor</h2>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {departments.map((dept) => (
              <Link
                key={dept.id}
                href={`/tienda?departamento=${dept.slug}`}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-charcoal-border bg-background-elevated p-8 text-center shadow-card transition hover:-translate-y-0.5 hover:border-gold-dark"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/10">
                  <DepartmentIcon
                    name={dept.name}
                    className="h-7 w-7 text-gold-dark transition group-hover:text-gold"
                  />
                </div>
                <span className="font-display text-base font-medium text-foreground">{dept.name}</span>
                <span className="text-xs text-gold-hover opacity-0 transition group-hover:opacity-100">
                  Ver productos →
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {bestSellers.length > 0 && (
        <section className="mx-auto max-w-5xl px-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-medium text-foreground">Más vendidos</h2>
            <Link href="/tienda?filtro=ofertas" className="text-xs text-gold-hover hover:underline">
              Ver ofertas →
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {bestSellers.map((product) => {
              const imagePath = firstImagePath(product.images);
              return (
                <Link
                  key={product.id}
                  href={`/tienda/${product.slug}`}
                  className="group overflow-hidden rounded-xl border border-charcoal-border bg-background-elevated shadow-card transition hover:-translate-y-0.5 hover:border-gold-dark"
                >
                  <div className="aspect-square overflow-hidden bg-background">
                    {imagePath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${publicProductBaseUrl}/${imagePath}`}
                        alt={product.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-foreground-muted/30">
                        <DepartmentIcon name="" className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm text-foreground">{product.name}</p>
                    <p className="mt-0.5 text-sm font-semibold text-gold">{formatCLP(product.price)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Mejores valorados */}
      {topRated.length > 0 && (
        <section className="mx-auto max-w-5xl px-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">
              Lo que dicen nuestros clientes
            </p>
            <h2 className="mt-2 font-display text-3xl font-medium text-foreground">Mejores valorados</h2>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {topRated.map((p) => (
              <Link
                key={p.slug}
                href={`/tienda/${p.slug}`}
                className="rounded-2xl border border-charcoal-border bg-background-elevated p-6 shadow-card transition hover:-translate-y-0.5 hover:border-gold-dark"
              >
                <p className="font-display text-base font-medium text-foreground">{p.name}</p>
                <p className="mt-1.5 text-gold">
                  {renderStars(p.avg)}{" "}
                  <span className="text-xs text-foreground-muted">
                    {p.avg.toFixed(1)} · {p.ratings.length} reseña{p.ratings.length === 1 ? "" : "s"}
                  </span>
                </p>
                {p.comment && (
                  <p className="mt-3 text-sm italic leading-relaxed text-foreground-muted">&quot;{p.comment}&quot;</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-5xl px-6">
        <NewsletterForm />
      </section>

      {/* Visítanos o Escríbenos */}
      {store && (
        <section id="visitanos" className="mx-auto max-w-3xl px-6">
          <div className="relative overflow-hidden rounded-2xl border border-gold-dark/30 bg-background-elevated p-10 text-center shadow-card">
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                background:
                  "radial-gradient(70% 60% at 50% 0%, color-mix(in srgb, var(--color-burgundy) 22%, transparent), transparent 70%)",
              }}
            />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">
                Visítanos o escríbenos
              </p>
              <h2 className="mt-2 font-display text-3xl font-medium text-foreground">{store.name}</h2>
              {store.contact_address && (
                <p className="mt-3 text-sm text-foreground-muted">{store.contact_address}</p>
              )}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-5 text-sm">
                {store.contact_phone && (
                  <a href={`tel:${store.contact_phone}`} className="text-gold-hover hover:text-gold">
                    {store.contact_phone}
                  </a>
                )}
                {store.contact_email && (
                  <a href={`mailto:${store.contact_email}`} className="text-gold-hover hover:text-gold">
                    {store.contact_email}
                  </a>
                )}
              </div>
              <SocialIcons links={store.social_links} className="mt-6 justify-center" />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
