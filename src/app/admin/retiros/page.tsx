import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { getModuleFlags } from "@/lib/settings/modules";
import { chileDateYmd } from "@/lib/stores/schedule";
import { formatPickupDate } from "@/lib/campaigns/types";
import { getPickupDays, getPickupLines, summarizeDays } from "@/lib/campaigns/pickups-data";
import { PickupList, type PickupRowData } from "./PickupList";

type SearchParams = { dia?: string };

export default async function AdminRetirosPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole(["admin", "operaciones"], "/admin-login");
  const { dia } = await searchParams;
  const { invoicing } = await getModuleFlags();

  const days = await getPickupDays({});
  const lines = await getPickupLines(days);
  const summaries = summarizeDays(days, lines);

  // Un mismo calendario puede repetirse en campañas distintas: los chips
  // agrupan por fecha y la lista muestra todas las campañas de ese día.
  const dates = [...new Set(days.map((d) => d.date))].sort();
  const today = chileDateYmd(new Date());
  const todayKey = `${today.y}-${String(today.m).padStart(2, "0")}-${String(today.d).padStart(2, "0")}`;
  const selected =
    dia && dates.includes(dia) ? dia : (dates.find((d) => d >= todayKey) ?? dates[dates.length - 1] ?? null);

  const unitsByDate = new Map<string, { committed: number; pending: number }>();
  for (const s of summaries) {
    const cur = unitsByDate.get(s.date) ?? { committed: 0, pending: 0 };
    unitsByDate.set(s.date, { committed: cur.committed + s.committed, pending: cur.pending + s.pending });
  }

  // Cuántas partes le quedan sin retirar a cada pedido (en todos los días):
  // la última cierra el pedido y pide la boleta.
  const pendingByOrder = new Map<string, number>();
  for (const l of lines) {
    if (!l.pickedUpAt) pendingByOrder.set(l.orderId, (pendingByOrder.get(l.orderId) ?? 0) + 1);
  }

  const daySummaries = summaries.filter((s) => s.date === selected);
  const rows: PickupRowData[] = lines
    .filter((l) => l.pickupDate === selected)
    .map((l) => ({
      pickupId: l.pickupId,
      orderNumber: l.orderNumber,
      customerName: l.customerName,
      customerPhone: l.customerPhone,
      productName: l.productName,
      quantity: l.quantity,
      pickedUpAt: l.pickedUpAt,
      orderClosed: l.orderStatus === "delivered",
      receiptNumber: l.receiptNumber,
      isLastPending: !l.pickedUpAt && pendingByOrder.get(l.orderId) === 1,
    }));

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Campañas</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-medium text-foreground">Retiros por día</h1>
        <Link
          href="/admin/reportes/retiros"
          className="rounded-md border border-charcoal-border px-3 py-1.5 text-xs text-foreground-muted hover:border-gold-dark hover:text-gold"
        >
          Reporte de retiros
        </Link>
      </div>

      {dates.length === 0 ? (
        <p className="mt-6 text-sm text-foreground-muted">
          Aún no hay días de retiro. Crea una campaña en{" "}
          <Link href="/admin/campanas" className="text-gold-hover underline">
            Campañas
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap gap-2">
            {dates.map((d) => {
              const u = unitsByDate.get(d);
              return (
                <Link
                  key={d}
                  href={`/admin/retiros?dia=${d}`}
                  className={`rounded-full border px-3 py-1.5 text-xs capitalize transition ${
                    d === selected
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-charcoal-border text-foreground-muted hover:border-gold-dark/60"
                  }`}
                >
                  {formatPickupDate(d)}
                  <span className="ml-1.5 text-[10px] opacity-70">
                    {u?.pending ?? 0}/{u?.committed ?? 0} u.
                  </span>
                </Link>
              );
            })}
          </div>

          {daySummaries.map((s) => (
            <div key={s.id} className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: `A producir · ${s.campaignName}`, value: s.committed },
                { label: "Cupo del día", value: s.capacity },
                { label: "Ya retiradas", value: s.pickedUp },
                { label: "Por retirar", value: s.pending },
              ].map((k) => (
                <div key={k.label} className="rounded-xl border border-white/10 bg-background-alt p-3">
                  <p className="text-[10px] uppercase tracking-wide text-foreground-muted">{k.label}</p>
                  <p className="mt-1 font-display text-2xl text-gold">{k.value}</p>
                </div>
              ))}
            </div>
          ))}

          <div className="mt-6">
            <PickupList rows={rows} invoicingEnabled={invoicing} />
          </div>
        </>
      )}
    </div>
  );
}
