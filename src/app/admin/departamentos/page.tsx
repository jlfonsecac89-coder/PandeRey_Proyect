import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { DepartamentoForm } from "./DepartamentoForm";

export default async function DepartamentosPage() {
  await requireRole(["admin"]);

  const supabase = await createClient();
  const { data: departments } = await supabase
    .from("departments")
    .select("id, code, name, is_active")
    .order("sort_order");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gold">Departamentos</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Nivel 1 del árbol de catálogo — la organización operativa real de la
          panadería (sección 13 del blueprint).
        </p>
      </div>
      <DepartamentoForm />
      <table className="w-full max-w-lg text-sm">
        <thead>
          <tr className="border-b border-charcoal-border text-left text-foreground/50">
            <th className="py-2 font-normal">Código</th>
            <th className="py-2 font-normal">Nombre</th>
            <th className="py-2 font-normal">Estado</th>
          </tr>
        </thead>
        <tbody>
          {(departments ?? []).map((d) => (
            <tr key={d.id} className="border-b border-charcoal-border/50">
              <td className="py-2 font-mono text-gold-dark">{d.code}</td>
              <td className="py-2">{d.name}</td>
              <td className="py-2 text-foreground/60">
                {d.is_active ? "Activo" : "Inactivo"}
              </td>
            </tr>
          ))}
          {(departments ?? []).length === 0 && (
            <tr>
              <td colSpan={3} className="py-4 text-foreground/40">
                Todavía no hay departamentos.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
