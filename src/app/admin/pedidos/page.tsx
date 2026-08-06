import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { PIPELINE_GROUPS, PIPELINE_ORDER, type PipelineGroup } from "@/lib/orders/pipeline";
import { PedidosTable } from "@/components/admin/PedidosTable";

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

type SearchParams = { grupo?: string; entrega?: string; rango?: string };

export default async function AdminPedidosPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole(["admin", "operaciones"], "/admin-login");
  const { grupo, entrega, rango } = await searchParams;
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
      "id, status, payment_method, delivery_method, total, created_at, store_id, user_id, assigned_driver_id, sla_deadline, delivered_at",
    )
    .order("created_at", { ascending: false })
    .limit(150);

  if (since) query = query.gte("created_at", since);
  // pending_payment queda afuera de la vista por defecto (carritos de Mercado
  // Pago abandonados a mitad de pago) salvo que se entre explícitamente al
  // grupo "Pago pendiente" — ahí es donde vive lo que sí necesita acción:
  // las transferencias por confirmar.
  if (activeGroup) query = query.in("status", PIPELINE_GROUPS[activeGroup].statuses);
  else query = query.neq("status", "pending_payment");
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
      ? supabase.from("order_items").select("order_id, product_name_snapshot, quantity").in("order_id", orderIds)
      : Promise.resolve({ data: [] as { order_id: string; product_name_snapshot: string; quantity: number }[] }),
  ]);

  function buildHref(overrides: Partial<SearchParams>) {
    const merged = { grupo, entrega, rango, ...overrides };
    const params = new URLSearchParams();
    if (merged.grupo) params.set("grupo", merged.grupo);
    if (merged.entrega) params.set("entrega", merged.entrega);
    if (merged.rango) params.set("rango", merged.rango);
    const qs = params.toString();
    return qs ? `/admin/pedidos?${qs}` : "/admin/pedidos";
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Seguimiento y control</p>
      <h1 className="mt-1 font-display text-2xl font-medium text-foreground">Pedidos</h1>

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
                  : "border-charcoal-border bg-background-elevated hover:border-gold-dark"
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
        <PedidosTable
          orders={orders ?? []}
          repartidores={repartidores ?? []}
          customers={customers ?? []}
          items={items ?? []}
        />
      </div>
    </div>
  );
}
