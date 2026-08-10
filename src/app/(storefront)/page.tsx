import Link from "next/link";
import { Wheat, ChefHat, Award, Store as StoreIcon, Truck, Sparkles, Croissant, Sandwich, Soup } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCLP } from "@/lib/format";
import { formatBusinessHours, type BusinessHours } from "@/lib/stores/schedule";
import { renderStars } from "@/lib/reviews/stars";
import { BannerCarousel } from "@/components/storefront/BannerCarousel";
import { NewsletterForm } from "@/components/storefront/NewsletterForm";
import { DepartmentIcon } from "@/components/storefront/DepartmentIcon";
import { SocialIcons } from "@/components/storefront/SocialIcons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid";
import { Marquee } from "@/components/ui/marquee";
import { NumberTicker } from "@/components/ui/number-ticker";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { DotPattern } from "@/components/ui/dot-pattern";
import { BorderBeam } from "@/components/ui/border-beam";

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

  const [
    { data: banners },
    { data: bestSellerIds },
    { data: store },
    { data: departments },
    { data: reviews },
    { count: activeProductCount },
  ] = await Promise.all([
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
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
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
  const allReviews = (reviews as ReviewRow[] | null) ?? [];
  const byProduct = new Map<string, { name: string; slug: string; ratings: number[]; comment: string | null }>();
  for (const r of allReviews) {
    const product = Array.isArray(r.product) ? r.product[0] : r.product;
    if (!product) continue;
    const entry = byProduct.get(product.slug) ?? { name: product.name, slug: product.slug, ratings: [], comment: null };
    entry.ratings.push(r.rating);
    if (r.comment && !entry.comment) entry.comment = r.comment;
    byProduct.set(product.slug, entry);
  }
  const withAvg = [...byProduct.values()]
    .map((p) => ({ ...p, avg: p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length }))
    .sort((a, b) => b.avg - a.avg || b.ratings.length - a.ratings.length);
  const topRated = withAvg.slice(0, 3);

  // Testimonios con comentario, para el marquee — el resto de reseñas
  // (sin comentario) sirven para el promedio pero no aportan a la cinta.
  const testimonials = withAvg.filter((p) => p.comment);

  const overallRatingCount = allReviews.length;
  const overallRatingAvg = overallRatingCount
    ? allReviews.reduce((sum, r) => sum + r.rating, 0) / overallRatingCount
    : 0;

  const publicBannerBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/banners`;
  const publicProductBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images`;

  // Hero armado como un único "slide" — mismo shape que necesitaría cada
  // item de un carrusel (eyebrow/título/subtítulo/CTAs) para que, si más
  // adelante se agregan más banners, alcance con mapear un array de estos
  // en vez de tener que rediseñar el bloque.
  const heroSlide = {
    eyebrow: "Pedidos online, horneado del día",
    title: (
      <>
        Horneado con oficio,
        <br />
        <span className="text-gold">todos los días</span>
      </>
    ),
    subtitle:
      "Pan, pastelería y café de elaboración artesanal — pedí online con retiro en tienda o despacho a domicilio.",
  };

  return (
    <div className="space-y-24 pb-24">
      {/* Hero — ver `heroSlide` arriba: la estructura ya está lista para
          volverse un carrusel (bastaría con un array de slides + un
          controlador de índice envolviendo este mismo bloque). */}
      <div className="relative overflow-hidden">
        <DotPattern
          glow
          className="absolute inset-0 [mask-image:radial-gradient(60%_50%_at_50%_0%,white,transparent)] text-gold/70"
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, color-mix(in srgb, var(--color-gold) 16%, transparent), transparent 70%)",
          }}
        />
        <div className="relative flex flex-col items-center justify-center gap-5 px-6 pb-6 pt-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-charcoal-border bg-background-alt px-4 py-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            <AnimatedGradientText colorFrom="#FAF290" colorTo="#F5F1E6" className="font-medium">
              {heroSlide.eyebrow}
            </AnimatedGradientText>
          </div>

          <h1 className="max-w-2xl font-display text-5xl font-medium leading-[1.1] text-foreground sm:text-6xl">
            {heroSlide.title}
          </h1>
          <p className="max-w-md text-[15px] leading-relaxed text-foreground-muted">{heroSlide.subtitle}</p>
          <div className="mt-3 flex gap-3">
            <Button size="lg" className="rounded-full px-6" render={<Link href="/tienda" />} nativeButton={false}>
              Pedir ahora
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="rounded-full border-charcoal-border px-6 text-foreground-muted hover:border-gold-dark hover:text-gold"
              render={<a href="#visitanos" />}
              nativeButton={false}
            >
              Visítanos
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-foreground-muted">
            <span className="flex items-center gap-2">
              <StoreIcon className="h-4 w-4 text-gold-dark" strokeWidth={1.6} />
              Retiro en tienda
            </span>
            <span className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-gold-dark" strokeWidth={1.6} />
              Despacho a domicilio
            </span>
            <span className="flex items-center gap-2">
              <ChefHat className="h-4 w-4 text-gold-dark" strokeWidth={1.6} />
              100% artesanal
            </span>
          </div>
        </div>

        {/* Franja de confianza */}
        <div className="relative mx-auto mt-14 flex max-w-3xl flex-wrap items-start justify-center gap-x-14 gap-y-6 px-6">
          {overallRatingCount > 0 && (
            <div className="flex flex-col items-center gap-1">
              <span className="font-display text-3xl font-medium text-gold">
                <NumberTicker value={overallRatingAvg} decimalPlaces={1} className="text-gold" />
              </span>
              <span className="text-xs text-foreground-muted">
                valoración · {overallRatingCount} reseña{overallRatingCount === 1 ? "" : "s"}
              </span>
            </div>
          )}
          {typeof activeProductCount === "number" && activeProductCount > 0 && (
            <div className="flex flex-col items-center gap-1">
              <span className="font-display text-3xl font-medium text-gold">
                <NumberTicker value={activeProductCount} className="text-gold" />
              </span>
              <span className="text-xs text-foreground-muted">productos en catálogo</span>
            </div>
          )}
          <div className="flex flex-col items-center gap-1">
            <span className="font-display text-3xl font-medium text-gold">100%</span>
            <span className="text-xs text-foreground-muted">elaboración artesanal</span>
          </div>
        </div>
      </div>

      {banners && banners.length > 0 && (
        <BannerCarousel banners={banners} publicBaseUrl={publicBannerBaseUrl} />
      )}

      {/* Historia */}
      <section className="mx-auto max-w-5xl px-6">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">Nuestra historia</p>
            <h2 className="mt-2 font-display text-3xl font-medium text-foreground">Hecho a mano, todos los días</h2>
            <div className="mt-4 h-px w-12 bg-gold-dark/60" />
            <p className="mt-6 text-[15px] leading-relaxed text-foreground-muted">
              En {store?.name ?? "Pan de Rey"} amasamos, horneamos y decoramos cada producto en nuestro propio
              obrador — sin atajos industriales. Empezamos con pan del día para el barrio y fuimos sumando
              pastelería y café a medida que nuestros vecinos nos lo pedían.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-foreground-muted">
              El mismo cariño con el que se amasa un pan de casa, todos los días, para que cada visita se sienta
              como llegar a la mesa familiar.
            </p>
          </div>

          {/* Mosaico asimétrico — una foto grande + dos apiladas, en vez de
              una grilla pareja, para que la sección respire y no se sienta
              como "otro bloque más" en el scroll. Placeholders con degradé
              dorado hasta que se carguen fotos reales del obrador. */}
          <div className="grid h-[22rem] grid-cols-2 gap-4 sm:h-[26rem]">
            <div
              className="relative col-span-1 row-span-2 overflow-hidden rounded-2xl border border-charcoal-border shadow-card"
              style={{
                background:
                  "radial-gradient(120% 100% at 20% 0%, color-mix(in srgb, var(--color-gold) 22%, transparent), var(--background-alt) 70%)",
              }}
            >
              <span className="absolute bottom-3 left-3 text-xs font-medium uppercase tracking-wide text-foreground-muted/80">
                El obrador
              </span>
            </div>
            <div
              className="relative overflow-hidden rounded-2xl border border-charcoal-border shadow-card"
              style={{
                background:
                  "radial-gradient(120% 120% at 80% 100%, color-mix(in srgb, var(--color-gold) 18%, transparent), var(--background-alt) 70%)",
              }}
            >
              <span className="absolute bottom-3 left-3 text-xs font-medium uppercase tracking-wide text-foreground-muted/80">
                Recién horneado
              </span>
            </div>
            <div
              className="relative overflow-hidden rounded-2xl border border-charcoal-border shadow-card"
              style={{
                background:
                  "radial-gradient(120% 120% at 20% 100%, color-mix(in srgb, var(--color-gold) 18%, transparent), var(--background-alt) 70%)",
              }}
            >
              <span className="absolute bottom-3 left-3 text-xs font-medium uppercase tracking-wide text-foreground-muted/80">
                Nuestro equipo
              </span>
            </div>
          </div>
        </div>

        <BentoGrid className="mt-14 auto-rows-[16rem] grid-cols-1 sm:grid-cols-3">
          <BentoCard
            name="Ingredientes reales"
            description="Harinas, mantequilla y fruta de verdad — sin mezclas industriales ni atajos."
            Icon={Wheat}
            href="/tienda"
            cta="Ver tienda"
            className="col-span-1"
            background={
              <div
                className="absolute inset-0 opacity-70"
                style={{
                  background:
                    "radial-gradient(60% 60% at 80% 10%, color-mix(in srgb, var(--color-gold) 14%, transparent), transparent 70%)",
                }}
              />
            }
          />
          <BentoCard
            name="Horneado diario"
            description="Cada partida sale del horno el mismo día que se vende, nunca de un depósito."
            Icon={ChefHat}
            href="/tienda"
            cta="Ver tienda"
            className="col-span-1"
            background={
              <div
                className="absolute inset-0 opacity-70"
                style={{
                  background:
                    "radial-gradient(60% 60% at 80% 10%, color-mix(in srgb, var(--color-gold) 14%, transparent), transparent 70%)",
                }}
              />
            }
          />
          <BentoCard
            name="Hecho a pedido"
            description="Relleno, cobertura y tamaño a elección en tortas y productos de celebración."
            Icon={Award}
            href="/tienda"
            cta="Ver tienda"
            className="col-span-1"
            background={
              <div
                className="absolute inset-0 opacity-70"
                style={{
                  background:
                    "radial-gradient(60% 60% at 80% 10%, color-mix(in srgb, var(--color-gold) 14%, transparent), transparent 70%)",
                }}
              />
            }
          />
        </BentoGrid>
      </section>

      {/* Especialidades — la fusión venezolano-chilena que define la marca */}
      <section className="mx-auto max-w-5xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">Especialidades</p>
          <h2 className="mt-2 font-display text-3xl font-medium text-foreground">Dos hornos, una misma casa</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-foreground-muted">
            Traemos las recetas con las que crecimos en Venezuela y las horneamos con el mismo respeto por la
            tradición panadera que encontramos en Chile — dos culturas del pan, en la misma vitrina.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {[
            {
              icon: Sandwich,
              badge: "Raíces venezolanas",
              name: "Pan de Jamón",
              description:
                "El pan de las fiestas en Caracas, horneado todo el año — masa suave enrollada con jamón, pasas y aceitunas.",
            },
            {
              icon: Croissant,
              badge: "Raíces venezolanas",
              name: "Cachitos",
              description:
                "La merienda de toda infancia venezolana: hojaldre dorado relleno de jamón, recién salido del horno.",
            },
            {
              icon: Soup,
              badge: "Alma chilena",
              name: "Marraqueta Pan de Rey",
              description:
                "Crocante por fuera, tibia por dentro — horneada como manda la tradición chilena, el pan de cada mesa.",
            },
          ].map((item) => (
            <div
              key={item.name}
              className="group rounded-2xl border border-charcoal-border/70 bg-background-alt p-6 shadow-card transition hover:-translate-y-0.5 hover:border-gold-dark/60"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10">
                <item.icon className="h-6 w-6 text-gold-dark transition group-hover:text-gold" />
              </div>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-dark">
                {item.badge}
              </p>
              <p className="mt-1.5 font-display text-lg font-medium text-foreground">{item.name}</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{item.description}</p>
              <Link
                href="/tienda"
                className="mt-4 inline-block text-xs font-medium text-gold-hover opacity-80 transition hover:text-gold hover:opacity-100"
              >
                Ver en la tienda →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Categorías por departamento */}
      {departments && departments.length > 0 && (
        <section className="mx-auto max-w-5xl px-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">Catálogo</p>
            <h2 className="mt-2 font-display text-3xl font-medium text-foreground">Explorá por categoría</h2>
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
            {bestSellers.map((product, index) => {
              const imagePath = firstImagePath(product.images);
              return (
                <Link
                  key={product.id}
                  href={`/tienda/${product.slug}`}
                  className="group relative overflow-hidden rounded-2xl border border-charcoal-border bg-background-elevated shadow-card transition hover:-translate-y-1 hover:border-gold-dark"
                >
                  {index < 3 && (
                    <Badge className="absolute left-2 top-2 z-10 h-auto px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide shadow-card">
                      Más vendido
                    </Badge>
                  )}
                  <div className="aspect-square overflow-hidden bg-background">
                    {imagePath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${publicProductBaseUrl}/${imagePath}`}
                        alt={product.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="flex h-full items-center justify-center text-gold-dark/35"
                        style={{
                          background:
                            "radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--color-gold) 12%, transparent), transparent 70%)",
                        }}
                      >
                        <DepartmentIcon name={product.name} className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <div className="p-3.5">
                    <p className="font-display text-[15px] font-medium leading-snug text-foreground">{product.name}</p>
                    <p className="mt-1 text-sm font-semibold text-gold">{formatCLP(product.price)}</p>
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

          {testimonials.length > 0 ? (
            <div className="mt-8 -mx-6">
              <Marquee pauseOnHover className="[--duration:35s]">
                {testimonials.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/tienda/${p.slug}`}
                    className="w-72 shrink-0 rounded-2xl border border-charcoal-border bg-background-elevated p-5 shadow-card transition hover:-translate-y-0.5 hover:border-gold-dark"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/10 text-sm font-semibold text-gold-dark">
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-display text-sm font-medium text-foreground">{p.name}</p>
                        <p className="text-gold">
                          {renderStars(p.avg)}{" "}
                          <span className="text-xs text-foreground-muted">{p.avg.toFixed(1)}</span>
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm italic leading-relaxed text-foreground-muted">&quot;{p.comment}&quot;</p>
                  </Link>
                ))}
              </Marquee>
            </div>
          ) : (
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
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="mx-auto max-w-5xl px-6">
        <div className="relative mx-auto max-w-sm overflow-hidden rounded-2xl border border-charcoal-border bg-background-elevated p-8 shadow-card">
          <BorderBeam size={80} duration={8} colorFrom="var(--color-gold)" colorTo="var(--color-gold-hover)" />
          <NewsletterForm />
        </div>
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
              {store.business_hours && (
                <p className="mt-1 text-sm text-foreground-muted">{formatBusinessHours(store.business_hours as BusinessHours)}</p>
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
