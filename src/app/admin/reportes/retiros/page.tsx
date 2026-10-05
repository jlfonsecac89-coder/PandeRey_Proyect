import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { formatOrderNumber } from "@/lib/format";
import { formatPickupDate } from "@/lib/campaigns/types";
import { getPickupDays, getPickupLines, summarizeDays } from "@/lib/campaigns/pickups-data";

type SearchParams = { campana?: string; desde?: string; hasta?: string; estado?: string };

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DATE_TIME = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const inputClass =
  "rounded-md border border-charcoal-border bg-background px-2 py-1 text-sm outline-none focus:border-gold";

export default async function ReporteRetirosPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole(["admin", "operaciones"], "/admin-login");
  const { campana, desde, hasta, estado } = await searchParams;
  const campaignId = campana && UUID.test(campana) ? campana : undefined;
  const from = desde && YMD.test(desde) ? desde : undefined;
  const to = hasta && YMD.test(hasta) ? hasta : undefined;
  const status = estado === "retirados" || estado === "pendientes" ? estado : "todos";

  const supabase = await createClient();
  const { data: campaigns } = await supabase.from("campaigns").select("id, name").order("created_at", { ascending: false });

  const days = await getPickupDays({ campaignId, from, to });
  const allLines = await getPickupLines(days);
  // El resumen por día siempre cuenta todo; el filtro de estado solo afecta el detalle.
  const summaries = summarizeDays(days, allLines);
  const lines =
    status === "retirados" ? allLines.filter((l) => l.pickedUpAt) : status === "pendientes" ? allLines.filter((l) => !l.pickedUpAt) : allLines;

  const totals = summaries.reduce(
    (t, s) => ({ committed: t.committed + s.committed, pickedUp: t.pickedUp + s.pickedUp, pending: t.pending + s.pending }),
    { committed: 0, pickedUp: 0, pending: 0 },
  );

  const csvParams = new URLSearchParams();
  if (campaignId) csvParams.set("campana", campaignId);
  if (from) csvParams.set("desde", from);
  if (to) csvParams.set("hasta", to);
  if (status !== "todos") csvParams.set("estado", status);
  const csvHref = `/admin/reportes/retiros/csv${csvParams.size ? `?${csvParams}` : ""}`;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Campañas</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-medium text-foreground">Reporte de retiros</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/retiros"
            className="rounded-md border border-charcoal-border px-3 py-1.5 text-xs text-foreground-muted hover:border-gold-dark hover:text-gold"
          >
            Retiros por día
          </Link>
          <a
            href={csvHref}
            className="rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-ink hover:bg-gold-hover"
          >
            Descargar CSV
          </a>
        </div>
      </div>

      <form method="get" className="mt-5 flex flex-wrap items-end gap-3">
        <label className="text-xs text-foreground-muted">
          Campaña
          <select name="campana" defaultValue={campaignId ?? ""} className={`mt-1 block ${inputClass}`}>
            <option value="">Todas</option>
            {(campaigns ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-foreground-muted">
          Desde
          <input type="date" name="desde" defaultValue={from ?? ""} className={`mt-1 block ${inputClass}`} />
        </label>
        <label className="text-xs text-foreground-muted">
          Hasta
          <input type="date" name="hasta" defaultValue={to ?? ""} className={`mt-1 block ${inputClass}`} />
        </label>
        <label className="text-xs text-foreground-muted">
          Estado
          <select name="estado" defaultValue={status} className={`mt-1 block ${inputClass}`}>
            <option value="todos">Todos</option>
            <option value="pendientes">Pendientes</option>
            <option value="retirados">Retirados</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md border border-charcoal-border px-3 py-1.5 text-xs text-foreground-muted hover:border-gold-dark hover:text-gold"
        >
          Filtrar
        </button>
      </form>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {[
          { label: "Unidades a producir", value: totals.committed },
          { label: "Ya retiradas", value: totals.pickedUp },
          { label: "Por retirar", value: totals.pending },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-white/10 bg-background-alt p-3">
            <p className="text-[10px] uppercase tracking-wide text-foreground-muted">{k.label}</p>
            <p className="mt-1 font-display text-2xl text-gold">{k.value}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-foreground-muted">Producción por día</h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-charcoal-border text-xs uppercase tracking-wide text-foreground-muted">
              <th className="py-2 pr-3 font-normal">Día</th>
              <th className="py-2 pr-3 font-normal">Campaña</th>
              <th className="py-2 pr-3 font-normal">A producir</th>
              <th className="py-2 pr-3 font-normal">Cupo</th>
              <th className="py-2 pr-3 font-normal">Retiradas</th>
              <th className="py-2 font-normal">Pendientes</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => (
              <tr key={s.id} className="border-b border-charcoal-border/50">
                <td className="py-2 pr-3 capitalize">{formatPickupDate(s.date)}</td>
                <td className="py-2 pr-3 text-foreground-muted">{s.campaignName}</td>
                <td className="py-2 pr-3 font-medium text-foreground">{s.committed}</td>
                <td className="py-2 pr-3 text-foreground-muted">{s.capacity}</td>
                <td className="py-2 pr-3">{s.pickedUp}</td>
                <td className="py-2">{s.pending}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {summaries.length === 0 && <p className="mt-3 text-sm text-foreground-muted">No hay días en ese rango.</p>}
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-foreground-muted">
        Detalle ({lines.length})
      </h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-charcoal-border text-xs uppercase tracking-wide text-foreground-muted">
              <th className="py-2 pr-3 font-normal">Pedido</th>
              <th className="py-2 pr-3 font-normal">Cliente</th>
              <th className="py-2 pr-3 font-normal">Producto</th>
              <th className="py-2 pr-3 font-normal">Unid.</th>
              <th className="py-2 pr-3 font-normal">Día</th>
              <th className="py-2 pr-3 font-normal">Retirado</th>
              <th className="py-2 font-normal">Boleta</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.pickupId} className="border-b border-charcoal-border/50">
                <td className="py-2 pr-3 font-mono text-xs text-gold-dark">{formatOrderNumber(l.orderNumber)}</td>
                <td className="py-2 pr-3">{l.customerName}</td>
                <td className="py-2 pr-3 text-foreground-muted">{l.productName}</td>
                <td className="py-2 pr-3">{l.quantity}</td>
                <td className="py-2 pr-3 capitalize">{formatPickupDate(l.pickupDate)}</td>
                <td className="py-2 pr-3 text-xs">
                  {l.pickedUpAt ? DATE_TIME.format(new Date(l.pickedUpAt)) : <span className="text-foreground-muted">Pendiente</span>}
                </td>
                <td className="py-2 text-xs">{l.receiptNumber ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {lines.length === 0 && <p className="mt-3 text-sm text-foreground-muted">No hay retiros con esos filtros.</p>}
      </div>
    </div>
  );
}
