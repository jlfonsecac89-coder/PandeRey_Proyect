import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { CatalogoTabs } from "@/components/admin/CatalogoTabs";
import { DepartamentoForm } from "./DepartamentoForm";

export default async function DepartamentosPage() {
  const profile = await requireRole(["admin"], "/admin-login");

  const supabase = await createClient();
  const { data: departments } = await supabase
    .from("departments")
    .select("id, code, name, is_active")
    .order("sort_order");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Producto y categorías</p>
        <h1 className="mt-1 font-display text-2xl font-medium text-foreground">Departamentos</h1>
      </div>
      <CatalogoTabs active="departamentos" role={profile.role} />
      <p className="text-sm text-foreground-muted">
        Nivel 1 del árbol de catálogo — la organización operativa real de la panadería.
      </p>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
        <DepartamentoForm />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] shadow-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-charcoal-border text-xs uppercase tracking-wide text-foreground-muted">
              <th className="px-4 py-3 font-normal">Código</th>
              <th className="px-4 py-3 font-normal">Nombre</th>
              <th className="px-4 py-3 font-normal">Estado</th>
            </tr>
          </thead>
          <tbody>
            {(departments ?? []).map((d) => (
              <tr key={d.id} className="border-b border-charcoal-border/50 last:border-0">
                <td className="px-4 py-2.5 font-mono text-gold-dark">{d.code}</td>
                <td className="px-4 py-2.5 text-foreground">{d.name}</td>
                <td className="px-4 py-2.5 text-foreground-muted">{d.is_active ? "Activo" : "Inactivo"}</td>
              </tr>
            ))}
            {(departments ?? []).length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-sm text-foreground-muted">
                  Todavía no hay departamentos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
