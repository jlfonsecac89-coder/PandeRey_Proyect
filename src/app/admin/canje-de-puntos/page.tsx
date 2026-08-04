import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { PointsCostRow } from "./PointsCostRow";

export default async function CanjeDePuntosPage() {
  await requireRole(["admin", "marketing"]);

  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, sku, name, points_cost")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gold">Canje de puntos</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Marcá qué productos son canjeables por puntos y su costo. Esta es la
          única escritura de Marketing sobre el catálogo (sección 13 del
          blueprint) — dejá el campo vacío para que un producto no sea
          canjeable.
        </p>
      </div>
      <table className="w-full max-w-2xl text-sm">
        <thead>
          <tr className="border-b border-charcoal-border text-left text-foreground/50">
            <th className="py-2 font-normal">SKU</th>
            <th className="py-2 font-normal">Producto</th>
            <th className="py-2 font-normal">Costo en puntos</th>
          </tr>
        </thead>
        <tbody>
          {(products ?? []).map((p) => (
            <PointsCostRow
              key={p.id}
              productId={p.id}
              name={p.name}
              sku={p.sku}
              pointsCost={p.points_cost}
            />
          ))}
          {(products ?? []).length === 0 && (
            <tr>
              <td colSpan={3} className="py-4 text-foreground/40">
                Todavía no hay productos activos.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
