import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCLP } from "@/lib/format";

type ProductImage = { storage_path: string; sort_order: number };
type ProductRow = {
  id: string;
  name: string;
  slug: string;
  price: number;
  is_gluten_free: boolean;
  images: ProductImage[];
};

function firstImagePath(images: ProductImage[]): string | null {
  if (!images.length) return null;
  return [...images].sort((a, b) => a.sort_order - b.sort_order)[0].storage_path;
}

export default async function TiendaPage({
  searchParams,
}: {
  searchParams: Promise<{ departamento?: string }>;
}) {
  const { departamento } = await searchParams;
  const supabase = await createClient();

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("sort_order");

  let categoryIds: string[] | null = null;
  if (departamento) {
    const dept = (departments ?? []).find((d) => d.slug === departamento);
    if (dept) {
      const { data: cats } = await supabase
        .from("categories")
        .select("id")
        .eq("department_id", dept.id);
      categoryIds = (cats ?? []).map((c) => c.id);
    } else {
      categoryIds = [];
    }
  }

  let query = supabase
    .from("products")
    .select("id, name, slug, price, is_gluten_free, images:product_images(storage_path, sort_order)")
    .eq("is_active", true)
    .order("name");
  if (categoryIds) {
    query = query.in("category_id", categoryIds.length ? categoryIds : ["00000000-0000-0000-0000-000000000000"]);
  }
  const { data: products } = await query;

  const publicBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images`;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-xl font-semibold text-gold">Tienda</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/tienda"
          className={`rounded-full border px-3 py-1 text-xs ${
            !departamento ? "border-gold text-gold" : "border-charcoal-border text-foreground/60"
          }`}
        >
          Todo
        </Link>
        {(departments ?? []).map((d) => (
          <Link
            key={d.id}
            href={`/tienda?departamento=${d.slug}`}
            className={`rounded-full border px-3 py-1 text-xs ${
              departamento === d.slug ? "border-gold text-gold" : "border-charcoal-border text-foreground/60"
            }`}
          >
            {d.name}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {(products as ProductRow[] | null ?? []).map((product) => {
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
                    src={`${publicBaseUrl}/${imagePath}`}
                    alt={product.name}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                )}
              </div>
              <p className="mt-2 text-sm text-foreground/90">{product.name}</p>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-sm font-semibold text-gold">{formatCLP(product.price)}</p>
                {product.is_gluten_free && (
                  <span className="rounded-full border border-charcoal-border px-2 py-0.5 text-[10px] text-foreground/60">
                    Sin gluten
                  </span>
                )}
              </div>
            </Link>
          );
        })}
        {(products ?? []).length === 0 && (
          <p className="col-span-full text-sm text-foreground/50">
            Todavía no hay productos publicados.
          </p>
        )}
      </div>
    </div>
  );
}
