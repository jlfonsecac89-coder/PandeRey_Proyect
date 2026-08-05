import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { formatCLP } from "@/lib/format";
import { togglePromotionActive } from "@/lib/promotions/actions";
import { PromocionForm } from "./PromocionForm";

export default async function PromocionesPage() {
  await requireRole(["admin", "marketing"]);
  const supabase = await createClient();

  const [{ data: promotions }, { data: departments }, { data: categories }, { data: products }] =
    await Promise.all([
      supabase
        .from("promotions")
        .select(
          "id, code, name, type, value, usage_count, max_uses, starts_at, ends_at, is_active",
        )
        .order("starts_at", { ascending: false }),
      supabase.from("departments").select("id, name").eq("is_active", true).order("name"),
      supabase.from("categories").select("id, name").eq("is_active", true).order("name"),
      supabase.from("products").select("id, name").eq("is_active", true).order("name"),
    ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gold">Promociones y cupones</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Sin código = promoción automática (se aplica sola dentro del carrito
          elegible). Con código = cupón que el cliente ingresa en el checkout.
        </p>
      </div>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-charcoal-border text-xs uppercase tracking-wide text-foreground/50">
            <th className="py-2 pr-3 font-normal">Nombre</th>
            <th className="py-2 pr-3 font-normal">Código</th>
            <th className="py-2 pr-3 font-normal">Descuento</th>
            <th className="py-2 pr-3 font-normal">Usos</th>
            <th className="py-2 pr-3 font-normal">Vigencia</th>
            <th className="py-2 font-normal">Estado</th>
          </tr>
        </thead>
        <tbody>
          {(promotions ?? []).map((p) => (
            <tr key={p.id} className="border-b border-charcoal-border">
              <td className="py-2 pr-3">{p.name}</td>
              <td className="py-2 pr-3 font-mono text-xs text-gold-dark">{p.code ?? "—"}</td>
              <td className="py-2 pr-3">
                {p.type === "percentage" ? `${p.value}%` : formatCLP(p.value)}
              </td>
              <td className="py-2 pr-3 text-xs text-foreground/60">
                {p.usage_count}
                {p.max_uses ? ` / ${p.max_uses}` : ""}
              </td>
              <td className="py-2 pr-3 text-xs text-foreground/50">
                {new Date(p.starts_at).toLocaleDateString("es-CL")} –{" "}
                {new Date(p.ends_at).toLocaleDateString("es-CL")}
              </td>
              <td className="py-2">
                <form action={togglePromotionActive.bind(null, p.id, !p.is_active)}>
                  <button
                    type="submit"
                    className={`rounded-full px-2 py-0.5 text-xs ${p.is_active ? "border border-gold text-gold" : "border border-charcoal-border text-foreground/50"}`}
                  >
                    {p.is_active ? "Activa" : "Inactiva"}
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {(promotions ?? []).length === 0 && (
            <tr>
              <td colSpan={6} className="py-4 text-foreground/40">
                Todavía no hay promociones.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <PromocionForm
        departments={departments ?? []}
        categories={categories ?? []}
        products={products ?? []}
      />
    </div>
  );
}
