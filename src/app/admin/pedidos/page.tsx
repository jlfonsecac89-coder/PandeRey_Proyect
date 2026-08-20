import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { PIPELINE_GROUPS, PIPELINE_ORDER, type PipelineGroup } from "@/lib/orders/pipeline";
import { PedidosTable } from "@/components/admin/PedidosTable";
import { KanbanBoard } from "@/components/admin/KanbanBoard";

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

const RANGO_OPTIONS: { key: string; label: string; since: () => string | null }[] = [
  { key: "hoy", label: "Hoy", since: () => startOfDay(new Date()) },
  { key: "7d", label: "Últimos 7 días", since: () => daysAgo(7) },
  { key: "30d", label: "Últimos 30 días", since: () => daysAgo(30) },
  { key: "todos", label: "Todos", since: () => null },
];

type SearchParams = { grupo?: string; entrega?: string; rango?: string; vista?: string };

export default async function AdminPedidosPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole(["admin", "operaciones"], "/admin-login");
  const { grupo, entrega, rango, vista } = await searchParams;
  const activeVista = vista === "kanban" ? "kanban" : "tabla";
  const supabase = await createClient();

  const activeRango = RANGO_OPTIONS.find((r) => r.key === rango) ?? RANGO_OPTIONS[2]; // default 30d
  const since = activeRango.since();
  const activeGroup = grupo && PIPELINE_ORDER.includes(grupo as PipelineGroup) ? (grupo as PipelineGroup) : null;

  // Conteos del pipeline — respetan el rango de fechas pero NO el grupo/entrega
  // activos, para que las tarjetas sigan mostrando el panorama completo aunque
  // ya se esté filtrando la tabla de abajo.
  const countQueries = PIPELINE_ORDER.map((key) => {
    let q = supabase.from("orders").select("id", { count: "exact", head: true }).in(
      "status",
      PIPELINE_GROUPS[key].statuses,
    );
    if (since) q = q.gte("created_at", since);
    return q;
  });
  const counts = await Promise.all(countQueries);

  let query = supabase
    .from("orders")
    .select(
      "id, status, payment_method, delivery_method, total, created_at, store_id, user_id, assigned_driver_id, sla_deadline, delivered_at, scheduled_at, ticket_printed_at",
    )
    .order("created_at", { ascending: false })
    .limit(150);

  if (since) query = query.gte("created_at", since);
  // Vista por defecto: todos los pedidos, incluido pago pendiente — el
  // administrador filtra por grupo del pipeline con las tarjetas de arriba
  // cuando quiere enfocarse en un estado puntual.
  if (activeGroup) query = query.in("status", PIPELINE_GROUPS[activeGroup].statuses);
  if (entrega === "pickup" || entrega === "shipping") query = query.eq("delivery_method", entrega);

  const { data: orders } = await query;

  const orderIds = (orders ?? []).map((o) => o.id);
  const customerIds = [...new Set((orders ?? []).map((o) => o.user_id))];

  const [{ data: repartidores }, { data: customers }, { data: items }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, phone, store_id").eq("role", "repartidor"),
    customerIds.length
      ? supabase.from("profiles").select("id, full_name, phone").in("id", customerIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string; phone: string | null }[] }),
    orderIds.length
      ? supabase
          .from("order_items")
          .select("order_id, product_name_snapshot, quantity, unit_price, subtotal")
          .in("order_id", orderIds)
      : Promise.resolve({
          data: [] as {
            order_id: string;
            product_name_snapshot: string;
            quantity: number;
            unit_price: number;
            subtotal: number;
          }[],
        }),
  ]);

  function buildHref(overrides: Partial<SearchParams>) {
    const merged = { grupo, entrega, rango, vista, ...overrides };
    const params = new URLSearchParams();
    if (merged.grupo) params.set("grupo", merged.grupo);
    if (merged.entrega) params.set("entrega", merged.entrega);
    if (merged.rango) params.set("rango", merged.rango);
    if (merged.vista) params.set("vista", merged.vista);
    const qs = params.toString();
    return qs ? `/admin/pedidos?${qs}` : "/admin/pedidos";
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Seguimiento y control</p>
      <div className="mt-1 flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium text-foreground">Pedidos</h1>
        <div className="flex rounded-full border border-white/10 p-0.5 text-[10px] font-semibold uppercase tracking-wide">
          <Link
            href={buildHref({ vista: undefined })}
            className={`rounded-full px-3 py-1 transition ${
              activeVista === "tabla" ? "bg-gold text-ink" : "text-foreground-muted"
            }`}
          >
            Tabla
          </Link>
          <Link
            href={buildHref({ vista: "kanban" })}
            className={`rounded-full px-3 py-1 transition ${
              activeVista === "kanban" ? "bg-gold text-ink" : "text-foreground-muted"
            }`}
          >
            Kanban
          </Link>
          <Link
            href="/admin/pedidos/monitor-impresion"
            className="rounded-full px-3 py-1 text-foreground-muted transition hover:text-gold"
          >
            Vigía de impresión
          </Link>
        </div>
      </div>

      {/* Pipeline */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {PIPELINE_ORDER.map((key, i) => {
          const isActive = activeGroup === key;
          return (
            <Link
              key={key}
              href={buildHref({ grupo: isActive ? undefined : key })}
              className={`rounded-xl border p-4 shadow-card transition ${
                isActive
                  ? "border-gold bg-gold/10"
                  : "border-white/10 bg-white/[0.03] hover:border-gold-dark"
              }`}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
                {PIPELINE_GROUPS[key].label}
              </p>
              <p className="mt-1.5 font-display text-2xl font-medium text-gold">{counts[i].count ?? 0}</p>
            </Link>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {RANGO_OPTIONS.map((r) => (
            <Link
              key={r.key}
              href={buildHref({ rango: r.key })}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                activeRango.key === r.key
                  ? "border-gold-dark text-gold-hover"
                  : "border-charcoal-border text-foreground-muted hover:text-gold"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
        <span className="text-charcoal-border">|</span>
        <div className="flex flex-wrap gap-1.5">
          {[
            { key: undefined, label: "Todas las entregas" },
            { key: "pickup", label: "Retiro" },
            { key: "shipping", label: "Envío" },
          ].map((e) => (
            <Link
              key={e.label}
              href={buildHref({ entrega: e.key })}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                (entrega ?? undefined) === e.key
                  ? "border-gold-dark text-gold-hover"
                  : "border-charcoal-border text-foreground-muted hover:text-gold"
              }`}
            >
              {e.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {activeVista === "kanban" ? (
          <KanbanBoard orders={orders ?? []} customers={customers ?? []} />
        ) : (
          <PedidosTable
            orders={orders ?? []}
            repartidores={repartidores ?? []}
            customers={customers ?? []}
            items={items ?? []}
          />
        )}
      </div>
    </div>
  );
}
