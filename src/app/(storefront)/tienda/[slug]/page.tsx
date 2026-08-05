import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { formatCLP } from "@/lib/format";
import { getClearanceDiscounts, applyClearanceDiscount } from "@/lib/catalog/clearance";
import { AddToCartForm } from "@/components/storefront/AddToCartForm";
import { RedeemPointsButton } from "@/components/storefront/RedeemPointsButton";

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
      "id, name, slug, description, price, points_cost, is_gluten_free, images:product_images(storage_path, sort_order)",
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

  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("is_active", true)
    .order("name")
    .limit(1)
    .maybeSingle();

  let redeemInfo: { pointsBalance: number; storeId: string } | null = null;
  if (product.points_cost) {
    const profile = await getCurrentProfile();
    if (profile && store) {
      redeemInfo = { pointsBalance: profile.points_balance, storeId: store.id };
    }
  }

  const clearanceDiscounts = store
    ? await getClearanceDiscounts(supabase, store.id, [product.id])
    : new Map<string, number>();
  const clearancePct = clearanceDiscounts.get(product.id);
  const discountedPrice = applyClearanceDiscount(product.price, clearancePct);

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
        {clearancePct ? (
          <p className="mt-1 text-lg text-foreground/90">
            {formatCLP(discountedPrice)}{" "}
            <span className="text-sm font-normal text-foreground/40 line-through">
              {formatCLP(product.price)}
            </span>
          </p>
        ) : (
          <p className="mt-1 text-lg text-foreground/90">{formatCLP(product.price)}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {clearancePct && (
            <span className="inline-block rounded-full border border-red-500/60 px-2 py-0.5 text-[10px] text-red-400">
              Liquidación -{clearancePct}%
            </span>
          )}
          {product.is_gluten_free && (
            <span className="inline-block rounded-full border border-charcoal-border px-2 py-0.5 text-[10px] text-foreground/60">
              Sin gluten
            </span>
          )}
        </div>
        {product.description && (
          <p className="mt-4 text-sm text-foreground/70">{product.description}</p>
        )}

        <div className="mt-6">
          <AddToCartForm
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              price: discountedPrice,
              imagePath: images[0]?.storage_path ?? null,
            }}
            optionGroups={optionGroups}
          />
        </div>

        {product.points_cost != null && (
          <div className="mt-4 rounded-lg border border-charcoal-border bg-charcoal-light p-3">
            <p className="text-sm text-foreground/80">
              Canjeable por <span className="text-gold">{product.points_cost} puntos</span>
            </p>
            {redeemInfo ? (
              <RedeemPointsButton
                productId={product.id}
                storeId={redeemInfo.storeId}
                pointsCost={product.points_cost}
                pointsBalance={redeemInfo.pointsBalance}
              />
            ) : (
              <p className="mt-1 text-xs text-foreground/50">
                Iniciá sesión para canjear este producto con tus puntos.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
