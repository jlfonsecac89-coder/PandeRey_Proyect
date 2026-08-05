import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { ProductoEditForm } from "./ProductoEditForm";
import { ImagenesSection } from "./ImagenesSection";
import { VariantesSection } from "./VariantesSection";
import { ColeccionesSection } from "./ColeccionesSection";
import { StockSection } from "./StockSection";

export default async function ProductoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin", "operaciones"]);
  const { id } = await params;

  const supabase = await createClient();

  const [
    { data: product },
    { data: images },
    { data: groups },
    { data: collections },
    { data: productCollections },
    { data: stores },
    { data: batches },
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, description, price, sku, is_gluten_free, is_active")
      .eq("id", id)
      .single(),
    supabase
      .from("product_images")
      .select("id, storage_path")
      .eq("product_id", id)
      .order("sort_order"),
    supabase
      .from("product_option_groups")
      .select("id, name, selection_type, values:product_option_values(id, name, price_delta)")
      .eq("product_id", id)
      .order("sort_order"),
    supabase.from("collections").select("id, name").order("name"),
    supabase.from("product_collections").select("collection_id").eq("product_id", id),
    supabase.from("stores").select("id, name").eq("is_active", true).order("name"),
    supabase
      .from("product_batches")
      .select("id, quantity, expiration_date, is_clearance, clearance_discount_percent, store:stores(name)")
      .eq("product_id", id)
      .order("expiration_date", { ascending: true, nullsFirst: false }),
  ]);

  if (!product) notFound();

  const publicBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images`;

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <p className="font-mono text-xs text-gold-dark">{product.sku}</p>
        <h1 className="text-xl font-semibold text-gold">{product.name}</h1>
      </div>

      <ProductoEditForm product={product} />
      <ImagenesSection productId={id} images={images ?? []} publicBaseUrl={publicBaseUrl} />
      <VariantesSection productId={id} groups={groups ?? []} />
      <ColeccionesSection
        productId={id}
        allCollections={collections ?? []}
        selectedIds={(productCollections ?? []).map((pc) => pc.collection_id)}
      />
      <StockSection
        productId={id}
        stores={stores ?? []}
        batches={batches ?? []}
        clearanceAlertDays={Number(process.env.CLEARANCE_ALERT_DAYS_BEFORE_EXPIRY ?? 3)}
      />
    </div>
  );
}
