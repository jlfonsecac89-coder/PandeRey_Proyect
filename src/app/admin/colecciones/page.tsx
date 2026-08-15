import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { CatalogoTabs } from "@/components/admin/CatalogoTabs";
import { ColeccionForm } from "./ColeccionForm";

export default async function ColeccionesPage() {
  const profile = await requireRole(["admin", "marketing"], "/admin-login");

  const supabase = await createClient();
  const { data: collections } = await supabase
    .from("collections")
    .select("id, name, starts_at, ends_at, is_active")
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Producto y categorías</p>
        <h1 className="mt-1 font-display text-2xl font-medium text-foreground">Colecciones</h1>
      </div>
      <CatalogoTabs active="colecciones" role={profile.role} />
      <p className="text-sm text-foreground-muted">
        Vitrinas transversales (Sin Gluten, Para Compartir, Navidad...). Un producto puede estar en varias a la vez.
      </p>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
        <ColeccionForm />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] shadow-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-charcoal-border text-xs uppercase tracking-wide text-foreground-muted">
              <th className="px-4 py-3 font-normal">Nombre</th>
              <th className="px-4 py-3 font-normal">Vigencia</th>
            </tr>
          </thead>
          <tbody>
            {(collections ?? []).map((c) => (
              <tr key={c.id} className="border-b border-charcoal-border/50 last:border-0">
                <td className="px-4 py-2.5 text-foreground">{c.name}</td>
                <td className="px-4 py-2.5 text-foreground-muted">
                  {c.starts_at || c.ends_at
                    ? `${c.starts_at ? new Date(c.starts_at).toLocaleDateString("es-CL") : "…"} — ${c.ends_at ? new Date(c.ends_at).toLocaleDateString("es-CL") : "…"}`
                    : "Permanente"}
                </td>
              </tr>
            ))}
            {(collections ?? []).length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-sm text-foreground-muted">
                  Todavía no hay colecciones.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
