import { formatCLP } from "@/lib/format";

const SEGMENT_LABELS: Record<string, string> = {
  estrella: "Estrella",
  leal: "Leal",
  promedio: "Promedio",
  dormido: "Dormido",
  perdido: "Perdido",
};

type Row = {
  user_id: string;
  segment: string;
  frequency_count: number;
  ltv_total: number;
  profile: { full_name: string } | { full_name: string }[] | null;
};

// Paso 6 del blueprint admin-redesign — top clientes por LTV histórico, sin
// query nueva (reutiliza las mismas filas del snapshot RFM más reciente por
// cliente, ya ordenadas por LTV en clientes/page.tsx antes de pasarlas acá).
export function RankingPanel({ rows, limit = 20 }: { rows: Row[]; limit?: number }) {
  const top = rows.slice(0, limit);

  return (
    <div className="max-w-2xl rounded-xl border border-white/10 bg-white/[0.03] shadow-card">
      {top.map((row, i) => {
        const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
        return (
          <div
            key={row.user_id}
            className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 last:border-0"
          >
            <div>
              <p className="text-sm text-foreground">
                {i + 1}. {profile?.full_name ?? row.user_id.slice(0, 8)}
              </p>
              <p className="text-xs text-foreground-muted">
                {SEGMENT_LABELS[row.segment] ?? row.segment} · {row.frequency_count} pedido
                {row.frequency_count === 1 ? "" : "s"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gold">{formatCLP(row.ltv_total)}</p>
              <p className="text-[10px] uppercase tracking-wide text-foreground-muted">LTV</p>
            </div>
          </div>
        );
      })}
      {top.length === 0 && <p className="px-4 py-6 text-center text-sm text-foreground-muted">Sin datos todavía.</p>}
    </div>
  );
}
