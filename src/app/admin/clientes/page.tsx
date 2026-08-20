import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { formatCLP } from "@/lib/format";
import { SegmentosPanel } from "./SegmentosPanel";
import { RankingPanel } from "./RankingPanel";

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

type Tab = "lista" | "segmentos" | "ranking";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ segmento?: string; orden?: string; tab?: string }>;
}) {
  await requireRole(["admin", "marketing"]);
  const { segmento, orden, tab } = await searchParams;
  const activeTab: Tab = tab === "segmentos" || tab === "ranking" ? tab : "lista";

  const supabase = await createClient();

  // No hay "distinct on user_id" simple en supabase-js — se trae ordenado
  // por computed_at desc y se queda con la primera aparición de cada
  // cliente (sección 14: siempre se lee la fila MÁS RECIENTE por usuario).
  // Una sola query para las 3 pestañas — Segmentos y Ranking (paso 6 del
  // blueprint admin-redesign) reutilizan estas mismas filas, sin duplicar
  // el fetch por tab activo.
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
  const allRows = [...latestByUser.values()];

  const distribution: Record<string, number> = {};
  for (const row of allRows) distribution[row.segment] = (distribution[row.segment] ?? 0) + 1;

  let listaRows = segmento ? allRows.filter((r) => r.segment === segmento) : allRows;
  if (orden === "monetary") {
    listaRows = [...listaRows].sort((a, b) => b.monetary_total - a.monetary_total);
  } else {
    listaRows = [...listaRows].sort((a, b) => b.ltv_total - a.ltv_total);
  }

  const rankingRows = [...allRows].sort((a, b) => b.ltv_total - a.ltv_total);

  function buildHref(overrides: { segmento?: string | null; orden?: string | null; tab?: string | null }) {
    const params = new URLSearchParams();
    const seg = overrides.segmento !== undefined ? overrides.segmento : segmento;
    const ord = overrides.orden !== undefined ? overrides.orden : orden;
    const t = overrides.tab !== undefined ? overrides.tab : activeTab;
    if (seg) params.set("segmento", seg);
    if (ord) params.set("orden", ord);
    if (t && t !== "lista") params.set("tab", t);
    const qs = params.toString();
    return qs ? `/admin/clientes?${qs}` : "/admin/clientes";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gold">Clientes</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Segmentación recalculada semanalmente por cron, no en tiempo real.
          Solo etiqueta y sugiere — cualquier contacto con el cliente lo hace
          el equipo manualmente.
        </p>
      </div>

      <div className="flex gap-1 border-b border-charcoal-border">
        {(
          [
            ["lista", "Lista"],
            ["segmentos", "Segmentos (RFM)"],
            ["ranking", "Ranking por LTV"],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={buildHref({ tab: key })}
            className={`border-b-2 px-3 py-2 text-sm transition ${
              activeTab === key
                ? "border-gold text-gold"
                : "border-transparent text-foreground/60 hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {allRows.length === 0 ? (
        <p className="text-sm text-foreground/50">
          Todavía no hay una segmentación calculada. Se genera automáticamente
          la primera vez que corre el cron semanal.
        </p>
      ) : (
        <>
          {activeTab === "lista" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildHref({ segmento: null })}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    !segmento ? "border-gold text-gold" : "border-charcoal-border text-foreground/60"
                  }`}
                >
                  Todos ({allRows.length})
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
                  {listaRows.map((row) => {
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
            </div>
          )}

          {activeTab === "segmentos" && <SegmentosPanel rows={allRows} />}

          {activeTab === "ranking" && <RankingPanel rows={rankingRows} />}
        </>
      )}
    </div>
  );
}
