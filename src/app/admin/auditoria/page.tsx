import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { formatCLP } from "@/lib/format";
import { actionLabel, entityLabel, ACTION_LABELS } from "@/lib/audit/labels";

type SearchParams = { accion?: string; buscar?: string; rango?: string };

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
  { key: "7d", label: "Últimos 7 días", since: () => daysAgo(7) },
  { key: "30d", label: "Últimos 30 días", since: () => daysAgo(30) },
  { key: "todos", label: "Todos", since: () => null },
];

// Cada acción tiene un único campo que le importa al admin — mostrar el
// resto del JSON crudo (before_data/after_data completo) no aporta nada
// que no sepa ya por el nombre de la acción. Precio se formatea en CLP con
// la variación, el resto en texto plano legible.
function formatChange(action: string, before: Record<string, unknown> | null, after: Record<string, unknown> | null): string {
  if (action === "product_price_changed") {
    const b = Number(before?.price ?? 0);
    const a = Number(after?.price ?? 0);
    const delta = a - b;
    const pct = b > 0 ? ((delta / b) * 100).toFixed(1) : "0";
    const sign = delta >= 0 ? "+" : "-";
    return `${formatCLP(b)} → ${formatCLP(a)} (${sign}${formatCLP(Math.abs(delta))}, ${sign}${Math.abs(Number(pct))}%)`;
  }
  return "—";
}

export default async function AuditoriaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole(["admin"], "/admin-login");
  const { accion, buscar, rango } = await searchParams;

  const supabase = await createClient();
  const activeRango = RANGO_OPTIONS.find((r) => r.key === rango) ?? RANGO_OPTIONS[1];
  const since = activeRango.since();

  // Resumen glanceable — siempre sobre los últimos 7 días, sin importar el
  // filtro activo de abajo, para que de un vistazo se sepa si pasó algo
  // fuera de lo normal esta semana sin tener que entrar a mirar filas.
  const weekAgo = daysAgo(7);
  const summaryCounts = await Promise.all(
    Object.keys(ACTION_LABELS).map((action) =>
      supabase
        .from("audit_log")
        .select("id", { count: "exact", head: true })
        .eq("action", action)
        .gte("created_at", weekAgo),
    ),
  );

  let query = supabase
    .from("audit_log")
    .select("id, actor_id, actor_role, action, entity_type, entity_id, before_data, after_data, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (since) query = query.gte("created_at", since);
  if (accion) query = query.eq("action", accion);
  if (buscar) query = query.eq("entity_id", buscar.trim());

  const { data: logs } = await query;

  const actorIds = [...new Set((logs ?? []).map((l) => l.actor_id).filter((id): id is string => Boolean(id)))];
  const { data: actors } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] as { id: string; full_name: string }[] };
  const actorById = new Map((actors ?? []).map((a) => [a.id, a.full_name]));

  function buildHref(overrides: Partial<SearchParams>) {
    const merged = { accion, buscar, rango, ...overrides };
    const params = new URLSearchParams();
    if (merged.accion) params.set("accion", merged.accion);
    if (merged.buscar) params.set("buscar", merged.buscar);
    if (merged.rango) params.set("rango", merged.rango);
    const qs = params.toString();
    return qs ? `/admin/auditoria?${qs}` : "/admin/auditoria";
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Configuración</p>
      <h1 className="mt-1 font-display text-2xl font-medium text-foreground">Auditoría</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Quién hizo qué en los cambios sensibles del sistema — precios, cuentas de staff, anonimización de clientes.
      </p>

      {/* Resumen — responde "¿pasó algo raro esta semana?" sin abrir un filtro */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.keys(ACTION_LABELS).map((action, i) => (
          <Link
            key={action}
            href={buildHref({ accion: action, rango: "7d" })}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-card transition hover:border-gold-dark"
          >
            <p className="text-xs uppercase tracking-wide text-foreground-muted">{actionLabel(action)}</p>
            <p className="mt-1.5 font-display text-2xl font-medium text-foreground">
              {summaryCounts[i].count ?? 0}
            </p>
            <p className="text-[10px] text-foreground-muted/60">últimos 7 días</p>
          </Link>
        ))}
      </div>

      {/* Filtro — un solo selector combinado en vez de 3 filas de chips: hay
          apenas 4 tipos de evento, no hace falta más que esto y un buscador. */}
      <form className="mt-5 flex flex-wrap items-center gap-2">
        <select
          name="accion"
          defaultValue={accion ?? ""}
          className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm outline-none focus:border-gold"
        >
          <option value="">Todas las acciones</option>
          {Object.keys(ACTION_LABELS).map((a) => (
            <option key={a} value={a}>
              {actionLabel(a)}
            </option>
          ))}
        </select>
        <select
          name="rango"
          defaultValue={activeRango.key}
          className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm outline-none focus:border-gold"
        >
          {RANGO_OPTIONS.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          name="buscar"
          defaultValue={buscar ?? ""}
          placeholder="Buscar por id de producto/cliente..."
          className="w-56 rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm outline-none focus:border-gold"
        />
        <button
          type="submit"
          className="rounded-md border border-charcoal-border px-3 py-1.5 text-sm text-foreground-muted hover:border-gold-dark hover:text-gold"
        >
          Filtrar
        </button>
        {(accion || buscar || rango) && (
          <Link href="/admin/auditoria" className="text-xs text-foreground-muted hover:text-gold">
            Limpiar filtros
          </Link>
        )}
      </form>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] shadow-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-charcoal-border text-xs uppercase tracking-wide text-foreground-muted">
              <th className="px-4 py-3 font-normal">Fecha</th>
              <th className="px-4 py-3 font-normal">Actor</th>
              <th className="px-4 py-3 font-normal">Acción</th>
              <th className="px-4 py-3 font-normal">Entidad</th>
              <th className="px-4 py-3 font-normal">Cambio</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((log) => (
              <tr key={log.id} className="border-b border-charcoal-border/50 align-top last:border-0">
                <td className="whitespace-nowrap px-4 py-2.5 text-xs text-foreground-muted">
                  {new Date(log.created_at).toLocaleString("es-CL")}
                </td>
                <td className="px-4 py-2.5 text-sm text-foreground">
                  {log.actor_id ? actorById.get(log.actor_id) ?? "—" : "Sistema"}
                  <p className="text-xs text-foreground-muted">{log.actor_role}</p>
                </td>
                <td className="px-4 py-2.5 text-sm text-foreground">{actionLabel(log.action)}</td>
                <td className="px-4 py-2.5 text-xs text-foreground-muted">
                  {entityLabel(log.entity_type)}
                  {log.entity_id && (
                    <span className="ml-1 font-mono text-foreground-muted/70">{log.entity_id.slice(0, 8)}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs text-foreground-muted">
                  {formatChange(
                    log.action,
                    log.before_data as Record<string, unknown> | null,
                    log.after_data as Record<string, unknown> | null,
                  )}
                </td>
              </tr>
            ))}
            {(logs ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-foreground-muted">
                  No hay eventos registrados con estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
