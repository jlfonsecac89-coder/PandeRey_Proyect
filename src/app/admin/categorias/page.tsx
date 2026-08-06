import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { CatalogoTabs } from "@/components/admin/CatalogoTabs";
import { CategoriaForm } from "./CategoriaForm";

export default async function CategoriasPage() {
  const profile = await requireRole(["admin"], "/admin-login");

  const supabase = await createClient();
  const [{ data: departments }, { data: categories }] = await Promise.all([
    supabase.from("departments").select("id, name").order("sort_order"),
    supabase
      .from("categories")
      .select("id, code, name, is_active, department:departments(name)")
      .order("sort_order"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Producto y categorías</p>
        <h1 className="mt-1 font-display text-2xl font-medium text-foreground">Categorías</h1>
      </div>
      <CatalogoTabs active="categorias" role={profile.role} />
      <p className="text-sm text-foreground-muted">Nivel 2 del árbol, dentro de cada departamento.</p>
      <div className="rounded-2xl border border-charcoal-border bg-background-elevated p-5 shadow-card">
        <CategoriaForm departments={departments ?? []} />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-charcoal-border bg-background-elevated shadow-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-charcoal-border text-xs uppercase tracking-wide text-foreground-muted">
              <th className="px-4 py-3 font-normal">Código</th>
              <th className="px-4 py-3 font-normal">Nombre</th>
              <th className="px-4 py-3 font-normal">Departamento</th>
              <th className="px-4 py-3 font-normal">Estado</th>
            </tr>
          </thead>
          <tbody>
            {(categories ?? []).map((c) => {
              const dept = Array.isArray(c.department) ? c.department[0] : c.department;
              return (
                <tr key={c.id} className="border-b border-charcoal-border/50 last:border-0">
                  <td className="px-4 py-2.5 font-mono text-gold-dark">{c.code}</td>
                  <td className="px-4 py-2.5 text-foreground">{c.name}</td>
                  <td className="px-4 py-2.5 text-foreground-muted">{dept?.name}</td>
                  <td className="px-4 py-2.5 text-foreground-muted">{c.is_active ? "Activa" : "Inactiva"}</td>
                </tr>
              );
            })}
            {(categories ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-foreground-muted">
                  Todavía no hay categorías.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
