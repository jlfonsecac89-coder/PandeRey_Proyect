import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { renderStars } from "@/lib/reviews/stars";
import { ModerateButtons } from "./ModerateButtons";

export default async function ResenasPage() {
  await requireRole(["admin", "marketing"]);
  const supabase = await createClient();

  const [{ data: pending }, { data: recent }] = await Promise.all([
    supabase
      .from("product_reviews")
      .select("id, rating, comment, created_at, product:products(name), profile:profiles!product_reviews_user_id_fkey(full_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase
      .from("product_reviews")
      .select("id, rating, comment, status, moderated_at, product:products(name), profile:profiles!product_reviews_user_id_fkey(full_name)")
      .neq("status", "pending")
      .order("moderated_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-gold">Reseñas de clientes</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Solo se pueden reseñar productos de pedidos ya entregados. Nada se publica sin moderar.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
          Pendientes ({(pending ?? []).length})
        </h2>
        <div className="mt-3 space-y-3">
          {(pending ?? []).map((r) => {
            const product = Array.isArray(r.product) ? r.product[0] : r.product;
            const author = Array.isArray(r.profile) ? r.profile[0] : r.profile;
            return (
              <div key={r.id} className="rounded-lg border border-charcoal-border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-foreground/90">
                      {product?.name} <span className="text-gold">{renderStars(r.rating)}</span>
                    </p>
                    <p className="text-xs text-foreground/40">
                      {author?.full_name} · {new Date(r.created_at).toLocaleDateString("es-CL")}
                    </p>
                    {r.comment && <p className="mt-1 text-sm text-foreground/70">{r.comment}</p>}
                  </div>
                  <ModerateButtons reviewId={r.id} />
                </div>
              </div>
            );
          })}
          {(pending ?? []).length === 0 && (
            <p className="text-sm text-foreground/40">No hay reseñas pendientes de moderar.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
          Moderadas recientemente
        </h2>
        <table className="mt-3 w-full max-w-3xl text-sm">
          <thead>
            <tr className="border-b border-charcoal-border text-left text-foreground/50">
              <th className="py-1.5 font-normal">Producto</th>
              <th className="py-1.5 font-normal">Cliente</th>
              <th className="py-1.5 font-normal">Valoración</th>
              <th className="py-1.5 font-normal">Estado</th>
            </tr>
          </thead>
          <tbody>
            {(recent ?? []).map((r) => {
              const product = Array.isArray(r.product) ? r.product[0] : r.product;
              const author = Array.isArray(r.profile) ? r.profile[0] : r.profile;
              return (
                <tr key={r.id} className="border-b border-charcoal-border/50">
                  <td className="py-1.5">{product?.name}</td>
                  <td className="py-1.5 text-foreground/60">{author?.full_name}</td>
                  <td className="py-1.5 text-gold">{renderStars(r.rating)}</td>
                  <td className="py-1.5 text-foreground/60">
                    {r.status === "approved" ? "Aprobada" : "Rechazada"}
                  </td>
                </tr>
              );
            })}
            {(recent ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="py-3 text-foreground/40">
                  Sin actividad todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
