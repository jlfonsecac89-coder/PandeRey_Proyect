import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { ImportForm } from "./ImportForm";
import { PendingRowActions } from "./PendingRowActions";

export default async function ImportarProductosPage() {
  await requireRole(["admin", "operaciones"]);

  const supabase = await createClient();

  const [{ data: imports }, { data: pendingRows }] = await Promise.all([
    supabase
      .from("product_imports")
      .select("id, file_name, status, total_rows, new_products, updated_pending, unchanged, new_variants, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("product_import_rows")
      .select("id, row_number, raw_data, match_type, import_id, product:products(name)")
      .eq("resolution", "pending")
      .order("row_number"),
  ]);

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-gold">Carga masiva de productos</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Cada fila se clasifica automáticamente: nuevo, sin cambios, variante
          agregada, o pendiente de confirmar (si cambió la descripción o el
          precio de un producto existente).
        </p>
        <Link href="/admin/productos" className="mt-1 inline-block text-xs text-gold-dark hover:text-gold">
          ← Volver a productos
        </Link>
      </div>

      <ImportForm />

      {(pendingRows ?? []).length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
            Pendientes de confirmar ({pendingRows!.length})
          </h2>
          <div className="mt-3 space-y-2">
            {pendingRows!.map((row) => {
              const raw = row.raw_data as Record<string, string>;
              const product = Array.isArray(row.product) ? row.product[0] : row.product;
              return (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-charcoal-border p-3 text-sm"
                >
                  <div>
                    <p className="text-foreground/90">
                      {product?.name ?? raw.nombre}{" "}
                      <span className="text-xs text-foreground/40">(fila {row.row_number})</span>
                    </p>
                    <p className="mt-0.5 text-xs text-foreground/50">
                      Descripción propuesta: {raw.descripcion || "(vacía)"} · Precio propuesto: $
                      {Number(raw.precio || 0).toLocaleString("es-CL")}
                    </p>
                  </div>
                  <PendingRowActions rowId={row.id} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
          Importaciones recientes
        </h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-charcoal-border text-left text-foreground/50">
              <th className="py-1.5 font-normal">Archivo</th>
              <th className="py-1.5 font-normal">Estado</th>
              <th className="py-1.5 font-normal">Filas</th>
              <th className="py-1.5 font-normal">Nuevos</th>
              <th className="py-1.5 font-normal">Pendientes</th>
              <th className="py-1.5 font-normal">Sin cambios</th>
              <th className="py-1.5 font-normal">Variantes</th>
            </tr>
          </thead>
          <tbody>
            {(imports ?? []).map((imp) => (
              <tr key={imp.id} className="border-b border-charcoal-border/50">
                <td className="py-1.5">{imp.file_name}</td>
                <td className="py-1.5 text-foreground/60">{imp.status}</td>
                <td className="py-1.5 text-foreground/60">{imp.total_rows}</td>
                <td className="py-1.5 text-foreground/60">{imp.new_products}</td>
                <td className="py-1.5 text-foreground/60">{imp.updated_pending}</td>
                <td className="py-1.5 text-foreground/60">{imp.unchanged}</td>
                <td className="py-1.5 text-foreground/60">{imp.new_variants}</td>
              </tr>
            ))}
            {(imports ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="py-3 text-foreground/40">
                  Todavía no se hizo ninguna carga masiva.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
