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

// Orden fijo de segmento a acción sugerida — mismo criterio que usa el cron
// de recompute_customer_rfm, solo para mostrar la acción típica de cada
// columna aunque el segmento no tenga filas todavía.
const SEGMENT_ORDER = ["estrella", "leal", "promedio", "dormido", "perdido"] as const;
const SEGMENT_DEFAULT_ACTION: Record<string, string> = {
  estrella: "premiar",
  leal: "impulsar_venta",
  promedio: "impulsar_venta",
  dormido: "retener",
  perdido: "activar",
};

type Row = { segment: string; monetary_total: number };

// Paso 6 del blueprint admin-redesign — extraído de la tabla plana que ya
// existía en clientes/page.tsx, sin query nueva (reutiliza las mismas filas
// ya traídas del snapshot RFM más reciente por cliente).
export function SegmentosPanel({ rows }: { rows: Row[] }) {
  const bySegment = new Map<string, { count: number; total: number }>();
  for (const row of rows) {
    const entry = bySegment.get(row.segment) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += row.monetary_total;
    bySegment.set(row.segment, entry);
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {SEGMENT_ORDER.map((key) => {
        const stats = bySegment.get(key) ?? { count: 0, total: 0 };
        return (
          <div key={key} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
              {SEGMENT_LABELS[key]}
            </p>
            <p className="mt-2 font-display text-3xl font-medium text-gold">{stats.count}</p>
            <p className="mt-1 text-xs text-foreground-muted">{formatCLP(stats.total)} en valor total</p>
            <p className="mt-3 border-t border-white/10 pt-2 text-xs text-foreground-muted">
              Sugerido: <span className="text-foreground">{ACTION_LABELS[SEGMENT_DEFAULT_ACTION[key]]}</span>
            </p>
          </div>
        );
      })}
    </div>
  );
}
