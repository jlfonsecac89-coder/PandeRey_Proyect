import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { CategoriaForm } from "./CategoriaForm";

export default async function CategoriasPage() {
  await requireRole(["admin"]);

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
        <h1 className="text-xl font-semibold text-gold">Categorías</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Nivel 2 del árbol, dentro de cada departamento.
        </p>
      </div>
      <CategoriaForm departments={departments ?? []} />
      <table className="w-full max-w-2xl text-sm">
        <thead>
          <tr className="border-b border-charcoal-border text-left text-foreground/50">
            <th className="py-2 font-normal">Código</th>
            <th className="py-2 font-normal">Nombre</th>
            <th className="py-2 font-normal">Departamento</th>
            <th className="py-2 font-normal">Estado</th>
          </tr>
        </thead>
        <tbody>
          {(categories ?? []).map((c) => {
            const dept = Array.isArray(c.department) ? c.department[0] : c.department;
            return (
              <tr key={c.id} className="border-b border-charcoal-border/50">
                <td className="py-2 font-mono text-gold-dark">{c.code}</td>
                <td className="py-2">{c.name}</td>
                <td className="py-2 text-foreground/60">{dept?.name}</td>
                <td className="py-2 text-foreground/60">
                  {c.is_active ? "Activa" : "Inactiva"}
                </td>
              </tr>
            );
          })}
          {(categories ?? []).length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-foreground/40">
                Todavía no hay categorías.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
