import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { ColeccionForm } from "./ColeccionForm";

export default async function ColeccionesPage() {
  await requireRole(["admin", "marketing"]);

  const supabase = await createClient();
  const { data: collections } = await supabase
    .from("collections")
    .select("id, name, starts_at, ends_at, is_active")
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gold">Colecciones</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Vitrinas transversales (Sin Gluten, Para Compartir, Navidad...). Un
          producto puede estar en varias a la vez.
        </p>
      </div>
      <ColeccionForm />
      <table className="w-full max-w-2xl text-sm">
        <thead>
          <tr className="border-b border-charcoal-border text-left text-foreground/50">
            <th className="py-2 font-normal">Nombre</th>
            <th className="py-2 font-normal">Vigencia</th>
          </tr>
        </thead>
        <tbody>
          {(collections ?? []).map((c) => (
            <tr key={c.id} className="border-b border-charcoal-border/50">
              <td className="py-2">{c.name}</td>
              <td className="py-2 text-foreground/60">
                {c.starts_at || c.ends_at
                  ? `${c.starts_at ? new Date(c.starts_at).toLocaleDateString("es-CL") : "…"} — ${c.ends_at ? new Date(c.ends_at).toLocaleDateString("es-CL") : "…"}`
                  : "Permanente"}
              </td>
            </tr>
          ))}
          {(collections ?? []).length === 0 && (
            <tr>
              <td colSpan={2} className="py-4 text-foreground/40">
                Todavía no hay colecciones.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
