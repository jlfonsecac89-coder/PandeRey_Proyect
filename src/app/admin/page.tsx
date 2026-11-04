import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatCLP, formatOrderNumber } from "@/lib/format";
import { getModuleFlags } from "@/lib/settings/modules";
import { DashboardCharts, type ProductSalesRow, type CategorySalesRow } from "@/components/admin/DashboardCharts";
import { PIPELINE_GROUPS, PIPELINE_ORDER, type PipelineGroup } from "@/lib/orders/pipeline";
import { STATUS_LABELS, type OrderStatus } from "@/lib/orders/status";
import { getCampaignDashboard } from "@/lib/campaigns/dashboard";
import { getOrderCampaignPickups } from "@/lib/campaigns/order-pickups";
import { formatPickupDate } from "@/lib/campaigns/types";

const ACTIVE_STATUSES = [
  "paid",
  "preparing",
  "ready",
  "ready_for_pickup",
  "driver_assigned",
  "in_route",
  "at_address",
  "delivery_issue",
  "returning_to_store",
  "returned_to_store",
];
const EXCLUDED_FROM_SALES = ["pending_payment", "cancelled"];

function startOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}
function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 60 * 1000).toISOString();
}
function dateNDaysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// Mismo selector que la referencia (1h/4h/1d/7d/15d/30d) — controla tanto los
// gráficos de venta como las tarjetas de pipeline y la tabla de pedidos
// recientes, para que todo el bloque "operativo" del Dashboard mire la misma
// ventana de tiempo a la vez.
const RANGE_OPTIONS: { key: string; label: string; hours: number }[] = [
  { key: "1h", label: "1 hora", hours: 1 },
  { key: "4h", label: "4 horas", hours: 4 },
  { key: "1d", label: "1 día", hours: 24 },
  { key: "7d", label: "7 días", hours: 24 * 7 },
  { key: "15d", label: "15 días", hours: 24 * 15 },
  { key: "30d", label: "30 días", hours: 24 * 30 },
];

// Colores por grupo de pipeline — mismo criterio semántico que la
// referencia (amarillo=pendiente, azul=en curso, verde=éxito, rojo=problema).
const GROUP_COLORS: Record<PipelineGroup, string> = {
  pago_pendiente: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  por_preparar: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  listos: "border-indigo-500/30 bg-indigo-500/10 text-indigo-400",
  en_camino: "border-purple-500/30 bg-purple-500/10 text-purple-400",
  problemas: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  entregados: "border-green-500/30 bg-green-500/10 text-green-400",
  cancelados: "border-red-500/30 bg-red-500/10 text-red-400",
};
const STATUS_PILL_COLORS: Record<PipelineGroup, string> = GROUP_COLORS;

type SearchParams = { range?: string; estado?: string };

// Suma de ventas en [from, to). Pagina de a 1000 filas: PostgREST corta ahí y
// con más pedidos el total quedaría subestimado sin avisar.
async function sumSales(
  supabase: Awaited<ReturnType<typeof createClient>>,
  from: string,
  to?: string,
): Promise<{ total: number; count: number }> {
  let total = 0;
  let count = 0;
  for (let offset = 0; ; offset += 1000) {
    let q = supabase
      .from("orders")
      .select("total")
      .gte("created_at", from)
      .not("status", "in", `(${EXCLUDED_FROM_SALES.join(",")})`)
      .order("created_at")
      .range(offset, offset + 999);
    if (to) q = q.lt("created_at", to);
    const { data } = await q;
    const rows = data ?? [];
    for (const r of rows) total += Number(r.total);
    count += rows.length;
    if (rows.length < 1000) break;
  }
  return { total, count };
}

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const { range, estado } = await searchParams;
  const supabase = await createClient();
  const role = profile.role;
  const isOps = role === "admin" || role === "operaciones";
  const isMarketingView = role === "admin" || role === "marketing";

  // Mismo criterio que /admin/pedidos: un pedido solo cuenta cuando tiene N°
  // (pago confirmado) y se ocultan los grupos de módulos apagados.
  const { delivery: deliveryOn, bank_transfer: bankTransferOn, inventory: inventoryOn } = await getModuleFlags();
  const visibleOrdersFilter = bankTransferOn
    ? "order_number.not.is.null,and(status.eq.pending_payment,payment_method.eq.bank_transfer)"
    : "order_number.not.is.null";
  const dashboardGroups = PIPELINE_ORDER.filter((key) => {
    if (key === "pago_pendiente") return bankTransferOn;
    return deliveryOn || (key !== "en_camino" && key !== "problemas");
  });

  const activeRange = RANGE_OPTIONS.find((r) => r.key === range) ?? RANGE_OPTIONS[3]; // default 7d
  const rangeSince = hoursAgo(activeRange.hours);
  const activeEstado =
    estado && dashboardGroups.includes(estado as PipelineGroup) ? (estado as PipelineGroup) : null;

  function buildHref(overrides: Partial<SearchParams>) {
    const merged = { range, estado, ...overrides };
    const params = new URLSearchParams();
    if (merged.range) params.set("range", merged.range);
    if (merged.estado) params.set("estado", merged.estado);
    const qs = params.toString();
    return qs ? `/admin?${qs}` : "/admin";
  }

  const prevSince = new Date(new Date(rangeSince).getTime() - activeRange.hours * 3600_000).toISOString();

  const [
    salesToday,
    salesRange,
    salesPrev,
    { count: activeOrdersCount },
    { data: recentDelivered },
    { data: expiringBatches },
    { count: newCustomersCount },
    { count: pendingReviewsCount },
    { count: newsletterCount },
    { data: productSales },
    { data: categorySales },
    pipelineCounts,
    { data: recentOrdersRaw },
  ] = await Promise.all([
    sumSales(supabase, startOfDay(new Date())),
    sumSales(supabase, rangeSince),
    sumSales(supabase, prevSince, rangeSince),
    supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ACTIVE_STATUSES),
    supabase
      .from("orders")
      .select("id, delivered_at, sla_deadline")
      .eq("status", "delivered")
      .gte("created_at", daysAgo(30))
      .not("delivered_at", "is", null),
    isOps && inventoryOn
      ? supabase
          .from("product_batches")
          .select("quantity, expiration_date, product:products(name)")
          .gt("quantity", 0)
          .not("expiration_date", "is", null)
          .lte("expiration_date", dateNDaysFromNow(Number(process.env.CLEARANCE_ALERT_DAYS_BEFORE_EXPIRY ?? 3)))
          .order("expiration_date", { ascending: true })
          .limit(8)
      : Promise.resolve({ data: [] as { quantity: number; expiration_date: string; product: { name: string } | { name: string }[] | null }[] }),
    isMarketingView
      ? supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer").gte("created_at", rangeSince)
      : Promise.resolve({ count: 0, data: null }),
    isMarketingView
      ? supabase.from("product_reviews").select("id", { count: "exact", head: true }).eq("status", "pending")
      : Promise.resolve({ count: 0, data: null }),
    isMarketingView
      ? supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("is_active", true)
      : Promise.resolve({ count: 0, data: null }),
    isMarketingView
      ? supabase.rpc("get_product_sales_summary", { hours: activeRange.hours, limit_count: 15 })
      : Promise.resolve({ data: [] as ProductSalesRow[] }),
    isMarketingView
      ? supabase.rpc("get_category_sales_summary", { hours: activeRange.hours, limit_count: 8 })
      : Promise.resolve({ data: [] as CategorySalesRow[] }),
    isOps
      ? Promise.all(
          dashboardGroups.map((key) =>
            supabase
              .from("orders")
              .select("id", { count: "exact", head: true })
              .in("status", PIPELINE_GROUPS[key].statuses)
              .or(visibleOrdersFilter)
              .gte("created_at", rangeSince),
          ),
        )
      : Promise.resolve([]),
    isOps
      ? (() => {
          let q = supabase
            .from("orders")
            .select("id, order_number, status, delivery_method, total, created_at, user_id")
            .or(visibleOrdersFilter)
            .gte("created_at", rangeSince)
            .order("created_at", { ascending: false })
            .limit(8);
          if (activeEstado) q = q.in("status", PIPELINE_GROUPS[activeEstado].statuses);
          return q;
        })()
      : Promise.resolve({ data: [] as { id: string; order_number: number | null; status: string; delivery_method: string; total: number; created_at: string; user_id: string }[] }),
  ]);

  // Los pedidos de campaña se entregan por días: su plazo es el primer día de
  // retiro, así que medirlos contra el SLA los marcaría siempre como atrasados.
  const campaignOrderIds = isOps
    ? await getOrderCampaignPickups((recentDelivered ?? []).map((o) => o.id))
    : new Map();
  const slaDeliveries = (recentDelivered ?? []).filter((o) => !campaignOrderIds.has(o.id));
  const onTimeDeliveries = slaDeliveries.filter(
    (o) => o.sla_deadline && new Date(o.delivered_at!) <= new Date(o.sla_deadline),
  );
  const onTimePct = slaDeliveries.length > 0 ? Math.round((onTimeDeliveries.length / slaDeliveries.length) * 100) : null;

  const rangeDeltaPct =
    salesPrev.total > 0 ? Math.round(((salesRange.total - salesPrev.total) / salesPrev.total) * 100) : null;
  const avgTicket = salesRange.count > 0 ? Math.round(salesRange.total / salesRange.count) : null;

  const campaigns = isOps ? await getCampaignDashboard() : [];

  // Nombres de cliente para la tabla de pedidos recientes — una consulta
  // aparte porque `orders.user_id` no tiene un embed directo utilizable acá
  // (mismo patrón que /admin/pedidos).
  const recentOrders = recentOrdersRaw ?? [];
  const recentCustomerIds = [...new Set(recentOrders.map((o) => o.user_id))];
  const { data: recentCustomers } = recentCustomerIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", recentCustomerIds)
    : { data: [] as { id: string; full_name: string }[] };
  const customerNameById = new Map((recentCustomers ?? []).map((c) => [c.id, c.full_name]));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Panel administrativo</p>
          <h1 className="mt-1 font-display text-3xl font-medium text-foreground">Hola, {profile.full_name}</h1>
        </div>
        {(isOps || isMarketingView) && (
          <div className="flex flex-wrap gap-1.5">
            {RANGE_OPTIONS.map((r) => (
              <Link
                key={r.key}
                href={buildHref({ range: r.key })}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  activeRange.key === r.key
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-white/10 text-foreground-muted hover:border-gold-dark/60 hover:text-gold"
                }`}
              >
                {r.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {isOps && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
            <p className="text-xs uppercase tracking-wide text-foreground-muted">Ventas hoy</p>
            <p className="mt-1.5 font-display text-2xl font-medium text-gold">{formatCLP(salesToday.total)}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
            <p className="text-xs uppercase tracking-wide text-foreground-muted">Ventas ({activeRange.label})</p>
            <p className="mt-1.5 font-display text-2xl font-medium text-gold">{formatCLP(salesRange.total)}</p>
            <p
              className={`mt-1 text-[11px] ${
                rangeDeltaPct === null ? "text-foreground-muted" : rangeDeltaPct >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {rangeDeltaPct === null
                ? "Sin período anterior para comparar"
                : `${rangeDeltaPct >= 0 ? "▲" : "▼"} ${Math.abs(rangeDeltaPct)}% vs período anterior`}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
            <p className="text-xs uppercase tracking-wide text-foreground-muted">Pedidos ({activeRange.label})</p>
            <p className="mt-1.5 font-display text-2xl font-medium text-foreground">{salesRange.count}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
            <p className="text-xs uppercase tracking-wide text-foreground-muted">Ticket promedio</p>
            <p className="mt-1.5 font-display text-2xl font-medium text-foreground">
              {avgTicket !== null ? formatCLP(avgTicket) : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
            <p className="text-xs uppercase tracking-wide text-foreground-muted">Pedidos activos</p>
            <p className="mt-1.5 font-display text-2xl font-medium text-foreground">{activeOrdersCount ?? 0}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
            <p className="text-xs uppercase tracking-wide text-foreground-muted">A tiempo (30 días)</p>
            <p className="mt-1.5 font-display text-2xl font-medium text-foreground">
              {onTimePct !== null ? `${onTimePct}%` : "—"}
            </p>
          </div>
        </div>
      )}

      {isOps && campaigns.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Campañas</h2>
            <Link href="/admin/retiros" className="text-xs text-gold-hover hover:underline">
              Retiros por día →
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {campaigns.slice(0, 4).map((c) => {
              const pct = c.capacity > 0 ? Math.min(Math.round((c.committed / c.capacity) * 100), 100) : 0;
              return (
                <div key={c.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.name}</p>
                      <p className="text-xs text-foreground-muted">{c.productName}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-foreground-muted">
                      {c.phase === "open"
                        ? "Recibiendo pedidos"
                        : c.phase === "before"
                          ? "Aún no abre"
                          : c.phase === "closed"
                            ? "Pedidos cerrados"
                            : "Desactivada"}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-foreground-muted">
                    {c.committed} de {c.capacity} unidades vendidas ({pct}% del cupo)
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="font-display text-lg text-gold">{c.todayPending}</p>
                      <p className="text-[10px] uppercase tracking-wide text-foreground-muted">Retiran hoy</p>
                    </div>
                    <div>
                      <p className="font-display text-lg text-foreground">{c.pending}</p>
                      <p className="text-[10px] uppercase tracking-wide text-foreground-muted">Por retirar</p>
                    </div>
                    <div>
                      <p className="font-display text-lg text-foreground">{c.pickedUp}</p>
                      <p className="text-[10px] uppercase tracking-wide text-foreground-muted">Retiradas</p>
                    </div>
                  </div>
                  {c.nextDay && (
                    <Link
                      href={`/admin/retiros?dia=${c.nextDay.date}`}
                      className="mt-3 block text-xs text-gold-hover hover:underline"
                    >
                      Próximo retiro: <span className="capitalize">{formatPickupDate(c.nextDay.date)}</span> ·{" "}
                      {c.nextDay.units} u. →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Tarjetas de pipeline — clicables, funcionan como filtro de la tabla
          de pedidos recientes de más abajo (mismo patrón que
          /admin/pedidos, aplicado acá al recorte del Dashboard). Van justo
          debajo de las tarjetas de ventas, antes de los gráficos. */}
      {isOps && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {dashboardGroups.map((key, i) => {
            const isActive = activeEstado === key;
            return (
              <Link
                key={key}
                href={buildHref({ estado: isActive ? undefined : key })}
                className={`rounded-xl border p-3.5 shadow-card transition ${
                  isActive ? "border-gold bg-gold/10" : "border-white/10 bg-white/[0.03] hover:border-gold-dark/60"
                }`}
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                  {PIPELINE_GROUPS[key].label}
                </p>
                <p className="mt-1 font-display text-xl font-medium text-gold">{pipelineCounts[i]?.count ?? 0}</p>
              </Link>
            );
          })}
        </div>
      )}

      {isMarketingView && (
        <DashboardCharts productSales={productSales ?? []} categorySales={categorySales ?? []} />
      )}

      {isOps && (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
              Pedidos recientes ({activeRange.label.toLowerCase()})
            </h2>
            <Link href="/admin/pedidos" className="text-xs text-gold-hover hover:underline">
              Ver todos →
            </Link>
          </div>

          <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] shadow-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-foreground-muted">
                  <th className="px-4 py-3 font-medium">Pedido</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Entrega</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentOrders.map((o) => {
                  const group = PIPELINE_ORDER.find((k) => (PIPELINE_GROUPS[k].statuses as string[]).includes(o.status));
                  return (
                    <tr key={o.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <Link href={`/admin/pedidos?grupo=${group ?? ""}`} className="font-mono text-xs text-gold-hover hover:underline">
                          {formatOrderNumber(o.order_number, o.id)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-foreground">{customerNameById.get(o.user_id) ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            group ? STATUS_PILL_COLORS[group] : "border-white/10 text-foreground-muted"
                          }`}
                        >
                          {STATUS_LABELS[o.status as OrderStatus] ?? o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground-muted">
                        {o.delivery_method === "pickup" ? "Retiro" : "Envío"}
                      </td>
                      <td className="px-4 py-3 text-foreground">{formatCLP(o.total)}</td>
                      <td className="px-4 py-3 text-foreground-muted">
                        {new Date(o.created_at).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  );
                })}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-foreground-muted">
                      Sin pedidos en este rango{activeEstado ? " para este estado" : ""}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {isOps && inventoryOn && (
          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
              Lotes próximos a vencer
            </h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              {(expiringBatches ?? []).map((b, i) => {
                const product = Array.isArray(b.product) ? b.product[0] : b.product;
                return (
                  <li key={i} className="flex justify-between text-foreground">
                    <span>{product?.name}</span>
                    <span className="text-gold-hover">
                      {b.quantity} u. · {new Date(b.expiration_date).toLocaleDateString("es-CL")}
                    </span>
                  </li>
                );
              })}
              {(expiringBatches ?? []).length === 0 && (
                <p className="text-sm text-foreground-muted">Sin lotes próximos a vencer.</p>
              )}
            </ul>
            <Link href="/admin/productos" className="mt-3 inline-block text-xs text-gold-hover hover:underline">
              Ver productos y stock →
            </Link>
          </section>
        )}

        {isMarketingView && (
          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Marketing</h2>
            <ul className="mt-3 space-y-2 text-sm text-foreground">
              <li className="flex justify-between">
                <span>Reseñas pendientes de moderar</span>
                <Link href="/admin/resenas" className="text-gold-hover hover:underline">
                  {pendingReviewsCount ?? 0}
                </Link>
              </li>
              <li className="flex justify-between">
                <span>Clientes nuevos ({activeRange.label})</span>
                <span>{newCustomersCount ?? 0}</span>
              </li>
              <li className="flex justify-between">
                <span>Suscriptores activos del newsletter</span>
                <span>{newsletterCount ?? 0}</span>
              </li>
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
