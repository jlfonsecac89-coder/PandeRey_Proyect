import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCLP } from "@/lib/format";
import { BannerCarousel } from "@/components/storefront/BannerCarousel";
import { NewsletterForm } from "@/components/storefront/NewsletterForm";

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

  const [{ data: banners }, { data: bestSellerIds }, { data: store }] = await Promise.all([
    supabase
      .from("banners")
      .select("id, title, subtitle, link_url, image_storage_path")
      .eq("is_active", true)
      .order("sort_order"),
    supabase.rpc("get_best_selling_product_ids", { days: 30, limit_count: 8 }),
    supabase
      .from("stores")
      .select("name, contact_address, contact_phone, contact_email, business_hours")
      .eq("is_active", true)
      .order("name")
      .limit(1)
      .maybeSingle(),
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

  const publicBannerBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/banners`;
  const publicProductBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images`;

  return (
    <div className="space-y-12 pb-16">
      <div className="flex flex-col items-center justify-center gap-4 px-6 pt-12 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-gold-dark">Pan de Rey</p>
        <h1 className="text-3xl font-semibold text-gold sm:text-4xl">Panadería Artesanal Premium</h1>
        <p className="max-w-md text-sm text-foreground/70">
          Pan, pastelería y café artesanal — pedí online con retiro en tienda o
          despacho a domicilio.
        </p>
        <Link
          href="/tienda"
          className="mt-2 rounded-md bg-gold px-5 py-2 text-sm font-semibold text-background hover:bg-gold-hover"
        >
          Ver la tienda
        </Link>
      </div>

      {banners && banners.length > 0 && (
        <BannerCarousel banners={banners} publicBaseUrl={publicBannerBaseUrl} />
      )}

      {bestSellers.length > 0 && (
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-lg font-semibold text-gold">Más vendidos</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {bestSellers.map((product) => {
              const imagePath = firstImagePath(product.images);
              return (
                <Link
                  key={product.id}
                  href={`/tienda/${product.slug}`}
                  className="group rounded-lg border border-charcoal-border bg-charcoal-light p-3 transition hover:border-gold-dark"
                >
                  <div className="aspect-square overflow-hidden rounded-md bg-background">
                    {imagePath && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${publicProductBaseUrl}/${imagePath}`}
                        alt={product.name}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    )}
                  </div>
                  <p className="mt-2 text-sm text-foreground/90">{product.name}</p>
                  <p className="text-sm font-semibold text-gold">{formatCLP(product.price)}</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-6">
        <NewsletterForm />
      </div>

      {store && (
        <div className="mx-auto max-w-5xl border-t border-charcoal-border px-6 pt-8 text-center text-sm text-foreground/60">
          <p className="text-gold-dark">{store.name}</p>
          {store.contact_address && <p>{store.contact_address}</p>}
          <p className="mt-1 space-x-3">
            {store.contact_phone && <span>{store.contact_phone}</span>}
            {store.contact_email && <span>{store.contact_email}</span>}
          </p>
        </div>
      )}
    </div>
  );
}
