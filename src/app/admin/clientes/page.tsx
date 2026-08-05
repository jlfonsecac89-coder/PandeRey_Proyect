import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { formatCLP } from "@/lib/format";

const SEGMENT_LABELS: Record<string, string> = {
  estrella: "Estrella",
  leal: "Leal",
  promedio: "Promedio",
  dormido: "Dormido",
  perdido: "Perdido",
};

const ACTION_LABELS: Record<string, string> = {
  premiar: "Premiar",
  impulsar_venta: "Impulsar venta",
  retener: "Retener",
  activar: "Activar",
};

type SnapshotRow = {
  user_id: string;
  computed_at: string;
  recency_days: number;
  frequency_count: number;
  monetary_total: number;
  ltv_total: number;
  segment: string;
  suggested_action: string;
  profile: { full_name: string } | { full_name: string }[] | null;
};

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ segmento?: string; orden?: string }>;
}) {
  await requireRole(["admin", "marketing"]);
  const { segmento, orden } = await searchParams;

  const supabase = await createClient();

  // No hay "distinct on user_id" simple en supabase-js — se trae ordenado
  // por computed_at desc y se queda con la primera aparición de cada
  // cliente (sección 14: siempre se lee la fila MÁS RECIENTE por usuario).
  const { data: allSnapshots } = await supabase
    .from("customer_rfm_snapshot")
    .select(
      "user_id, computed_at, recency_days, frequency_count, monetary_total, ltv_total, segment, suggested_action, profile:profiles(full_name)",
    )
    .order("computed_at", { ascending: false });

  const latestByUser = new Map<string, SnapshotRow>();
  for (const row of (allSnapshots as SnapshotRow[] | null) ?? []) {
    if (!latestByUser.has(row.user_id)) latestByUser.set(row.user_id, row);
  }
  let rows = [...latestByUser.values()];

  const distribution: Record<string, number> = {};
  for (const row of rows) distribution[row.segment] = (distribution[row.segment] ?? 0) + 1;

  if (segmento) rows = rows.filter((r) => r.segment === segmento);

  if (orden === "monetary") {
    rows.sort((a, b) => b.monetary_total - a.monetary_total);
  } else {
    rows.sort((a, b) => b.ltv_total - a.ltv_total);
  }

  function buildHref(overrides: { segmento?: string | null; orden?: string | null }) {
    const params = new URLSearchParams();
    const seg = overrides.segmento !== undefined ? overrides.segmento : segmento;
    const ord = overrides.orden !== undefined ? overrides.orden : orden;
    if (seg) params.set("segmento", seg);
    if (ord) params.set("orden", ord);
    const qs = params.toString();
    return qs ? `/admin/clientes?${qs}` : "/admin/clientes";
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gold">Clientes — Performance (RFM)</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Segmentación recalculada semanalmente por cron, no en tiempo real.
          Solo etiqueta y sugiere — cualquier contacto con el cliente lo hace
          el equipo manualmente.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-foreground/50">
          Todavía no hay una segmentación calculada. Se genera automáticamente
          la primera vez que corre el cron semanal.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildHref({ segmento: null })}
              className={`rounded-full border px-3 py-1 text-xs ${
                !segmento ? "border-gold text-gold" : "border-charcoal-border text-foreground/60"
              }`}
            >
              Todos ({[...latestByUser.values()].length})
            </Link>
            {Object.entries(SEGMENT_LABELS).map(([key, label]) => (
              <Link
                key={key}
                href={buildHref({ segmento: segmento === key ? null : key })}
                className={`rounded-full border px-3 py-1 text-xs ${
                  segmento === key ? "border-gold text-gold" : "border-charcoal-border text-foreground/60"
                }`}
              >
                {label} ({distribution[key] ?? 0})
              </Link>
            ))}
          </div>

          <div className="flex gap-2 text-xs">
            <span className="text-foreground/50">Ordenar por:</span>
            <Link
              href={buildHref({ orden: "ltv" })}
              className={orden !== "monetary" ? "text-gold" : "text-foreground/60 hover:text-gold"}
            >
              LTV histórico
            </Link>
            <Link
              href={buildHref({ orden: "monetary" })}
              className={orden === "monetary" ? "text-gold" : "text-foreground/60 hover:text-gold"}
            >
              Gasto reciente
            </Link>
          </div>

          <table className="w-full max-w-4xl text-sm">
            <thead>
              <tr className="border-b border-charcoal-border text-left text-foreground/50">
                <th className="py-2 font-normal">Cliente</th>
                <th className="py-2 font-normal">Segmento</th>
                <th className="py-2 font-normal">Acción sugerida</th>
                <th className="py-2 font-normal">Recencia (días)</th>
                <th className="py-2 font-normal">Compras (ventana)</th>
                <th className="py-2 font-normal">Gasto (ventana)</th>
                <th className="py-2 font-normal">LTV histórico</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
                return (
                  <tr key={row.user_id} className="border-b border-charcoal-border/50">
                    <td className="py-2">{profile?.full_name ?? row.user_id.slice(0, 8)}</td>
                    <td className="py-2 text-foreground/80">{SEGMENT_LABELS[row.segment] ?? row.segment}</td>
                    <td className="py-2 text-foreground/60">
                      {ACTION_LABELS[row.suggested_action] ?? row.suggested_action}
                    </td>
                    <td className="py-2 text-foreground/60">{row.recency_days}</td>
                    <td className="py-2 text-foreground/60">{row.frequency_count}</td>
                    <td className="py-2 text-foreground/60">{formatCLP(row.monetary_total)}</td>
                    <td className="py-2 text-foreground/60">{formatCLP(row.ltv_total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
