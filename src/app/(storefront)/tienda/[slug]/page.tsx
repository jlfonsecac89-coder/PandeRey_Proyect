import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCLP } from "@/lib/format";
import { AddToCartForm } from "@/components/storefront/AddToCartForm";

export default async function ProductoDetallePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select(
      "id, name, slug, description, price, is_gluten_free, images:product_images(storage_path, sort_order)",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!product) notFound();

  const { data: groups } = await supabase
    .from("product_option_groups")
    .select("id, name, selection_type, is_required, values:product_option_values(id, name, price_delta, is_active)")
    .eq("product_id", product.id)
    .order("sort_order");

  const optionGroups = (groups ?? []).map((g) => ({
    ...g,
    values: (g.values ?? []).filter((v) => v.is_active),
  }));

  const publicBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images`;
  const images = [...product.images].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 px-6 py-8 sm:grid-cols-2">
      <div className="aspect-square overflow-hidden rounded-lg border border-charcoal-border bg-charcoal-light">
        {images[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${publicBaseUrl}/${images[0].storage_path}`}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-gold">{product.name}</h1>
        <p className="mt-1 text-lg text-foreground/90">{formatCLP(product.price)}</p>
        {product.is_gluten_free && (
          <span className="mt-2 inline-block rounded-full border border-charcoal-border px-2 py-0.5 text-[10px] text-foreground/60">
            Sin gluten
          </span>
        )}
        {product.description && (
          <p className="mt-4 text-sm text-foreground/70">{product.description}</p>
        )}

        <div className="mt-6">
          <AddToCartForm
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              price: product.price,
              imagePath: images[0]?.storage_path ?? null,
            }}
            optionGroups={optionGroups}
          />
        </div>
      </div>
    </div>
  );
}
