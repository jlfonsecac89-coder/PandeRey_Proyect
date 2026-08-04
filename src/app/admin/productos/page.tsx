import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { ProductoForm } from "./ProductoForm";

export default async function ProductosPage() {
  await requireRole(["admin", "operaciones"]);

  const supabase = await createClient();
  const [{ data: products }, { data: categories }, { data: collections }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, sku, price, is_active, category:categories(name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("categories")
      .select("id, name, department:departments(name)")
      .order("name"),
    supabase.from("collections").select("id, name").order("name"),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gold">Productos</h1>
        <p className="mt-1 text-sm text-foreground/60">
          El SKU se genera automáticamente — nunca se escribe a mano.
        </p>
      </div>

      <ProductoForm categories={categories ?? []} collections={collections ?? []} />

      <table className="w-full max-w-3xl text-sm">
        <thead>
          <tr className="border-b border-charcoal-border text-left text-foreground/50">
            <th className="py-2 font-normal">SKU</th>
            <th className="py-2 font-normal">Nombre</th>
            <th className="py-2 font-normal">Categoría</th>
            <th className="py-2 font-normal">Precio</th>
            <th className="py-2 font-normal">Estado</th>
          </tr>
        </thead>
        <tbody>
          {(products ?? []).map((p) => {
            const cat = Array.isArray(p.category) ? p.category[0] : p.category;
            return (
              <tr key={p.id} className="border-b border-charcoal-border/50">
                <td className="py-2 font-mono text-xs text-gold-dark">{p.sku}</td>
                <td className="py-2">
                  <Link href={`/admin/productos/${p.id}`} className="hover:text-gold">
                    {p.name}
                  </Link>
                </td>
                <td className="py-2 text-foreground/60">{cat?.name}</td>
                <td className="py-2 text-foreground/60">
                  ${Number(p.price).toLocaleString("es-CL")}
                </td>
                <td className="py-2 text-foreground/60">{p.is_active ? "Activo" : "Inactivo"}</td>
              </tr>
            );
          })}
          {(products ?? []).length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-foreground/40">
                Todavía no hay productos.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
