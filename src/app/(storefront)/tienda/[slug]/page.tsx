import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { formatCLP } from "@/lib/format";
import { getClearanceDiscounts, applyClearanceDiscount } from "@/lib/catalog/clearance";
import { AddToCartForm } from "@/components/storefront/AddToCartForm";
import { RedeemPointsButton } from "@/components/storefront/RedeemPointsButton";
import { ProductReviews } from "@/components/storefront/ProductReviews";
import { DepartmentIcon } from "@/components/storefront/DepartmentIcon";

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

  const { data: reviews } = await supabase
    .from("product_reviews")
    .select("id, rating, comment, created_at, profile:profiles!product_reviews_user_id_fkey(full_name)")
    .eq("product_id", product.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-10 px-6 py-10 sm:grid-cols-2">
      <div className="aspect-square overflow-hidden rounded-2xl border border-charcoal-border bg-background-elevated shadow-card">
        {images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${publicBaseUrl}/${images[0].storage_path}`}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-foreground-muted/25">
            <DepartmentIcon name="" className="h-16 w-16" />
          </div>
        )}
      </div>

      <div>
        <h1 className="font-display text-3xl font-medium text-foreground">{product.name}</h1>
        {clearancePct ? (
          <p className="mt-2 text-xl text-foreground">
            {formatCLP(discountedPrice)}{" "}
            <span className="text-sm font-normal text-foreground-muted/60 line-through">
              {formatCLP(product.price)}
            </span>
          </p>
        ) : (
          <p className="mt-2 text-xl font-semibold text-gold">{formatCLP(product.price)}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {clearancePct && (
            <span className="inline-block rounded-full bg-burgundy px-2.5 py-1 text-[11px] font-medium text-foreground">
              Liquidación -{clearancePct}%
            </span>
          )}
          {product.is_gluten_free && (
            <span className="inline-block rounded-full border border-charcoal-border px-2.5 py-1 text-[11px] text-foreground-muted">
              Sin gluten
            </span>
          )}
        </div>
        {product.description && (
          <p className="mt-5 text-[15px] leading-relaxed text-foreground-muted">{product.description}</p>
        )}

        <div className="mt-7 border-t border-charcoal-border pt-6">
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
          <div className="mt-5 rounded-xl border border-gold-dark/30 bg-gold/5 p-4">
            <p className="text-sm text-foreground">
              Canjeable por <span className="font-semibold text-gold">{product.points_cost} puntos</span>
            </p>
            {redeemInfo ? (
              <RedeemPointsButton
                productId={product.id}
                storeId={redeemInfo.storeId}
                pointsCost={product.points_cost}
                pointsBalance={redeemInfo.pointsBalance}
              />
            ) : (
              <p className="mt-1 text-xs text-foreground-muted">
                Iniciá sesión para canjear este producto con tus puntos.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-charcoal-border pt-8 sm:col-span-2">
        <h2 className="font-display text-xl font-medium text-foreground">Reseñas</h2>
        <ProductReviews reviews={reviews ?? []} />
      </div>
    </div>
  );
}
