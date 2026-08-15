"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatCLP } from "@/lib/format";
import { PIPELINE_GROUPS, PIPELINE_ORDER, type PipelineGroup } from "@/lib/orders/pipeline";
import type { AdminOrder } from "./AdminOrderRow";

type Person = { id: string; full_name: string; phone: string | null };

// Colores por grupo — mismo criterio semántico que en todo el panel
// (amarillo=pendiente, azul=en curso, verde=éxito, rojo=problema).
const COLUMN_COLORS: Record<PipelineGroup, string> = {
  pago_pendiente: "border-yellow-500/30",
  por_preparar: "border-blue-500/30",
  listos: "border-indigo-500/30",
  en_camino: "border-purple-500/30",
  problemas: "border-orange-500/30",
  entregados: "border-green-500/30",
  cancelados: "border-red-500/30",
};

function slaBadge(order: AdminOrder): { label: string; className: string } | null {
  if (!order.sla_deadline || order.status === "delivered" || order.status === "cancelled") return null;
  const deadline = new Date(order.sla_deadline).getTime();
  const now = Date.now();
  const minutesLeft = Math.round((deadline - now) / 60000);
  if (minutesLeft < 0) {
    return { label: `Vencido hace ${Math.abs(minutesLeft)} min`, className: "text-red-400" };
  }
  if (minutesLeft <= 10) {
    return { label: `${minutesLeft} min`, className: "text-orange-400" };
  }
  return { label: `${minutesLeft} min`, className: "text-foreground-muted" };
}

// Vista alternativa a la tabla — mismas órdenes, agrupadas por columna de
// pipeline (igual que las tarjetas de arriba, pero como tablero en vez de
// contador). Cada tarjeta linkea a la tabla filtrada a ese pedido puntual —
// las acciones (asignar repartidor, marcar listo, etc.) siguen viviendo solo
// en la fila de la tabla, para no duplicar esa lógica en dos lugares.
export function KanbanBoard({
  orders,
  customers,
}: {
  orders: AdminOrder[];
  customers: Person[];
}) {
  const [search, setSearch] = useState("");
  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const customer = customerById.get(o.user_id);
      return o.id.slice(0, 8).toLowerCase().includes(q) || customer?.full_name?.toLowerCase().includes(q);
    });
  }, [orders, search, customerById]);

  const byGroup = useMemo(() => {
    const map = new Map<PipelineGroup, AdminOrder[]>();
    for (const key of PIPELINE_ORDER) map.set(key, []);
    for (const order of filtered) {
      const group = PIPELINE_ORDER.find((k) => (PIPELINE_GROUPS[k].statuses as string[]).includes(order.status));
      if (group) map.get(group)!.push(order);
    }
    return map;
  }, [filtered]);

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por código o cliente..."
        className="w-64 rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm outline-none focus:border-gold"
      />

      <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
        {PIPELINE_ORDER.map((key) => {
          const columnOrders = byGroup.get(key) ?? [];
          return (
            <div key={key} className="w-72 shrink-0">
              <div className={`flex items-center justify-between border-b-2 pb-2 ${COLUMN_COLORS[key]}`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                  {PIPELINE_GROUPS[key].label}
                </p>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-foreground">
                  {columnOrders.length}
                </span>
              </div>
              <div className="mt-2 space-y-2">
                {columnOrders.map((order) => {
                  const customer = customerById.get(order.user_id);
                  const sla = slaBadge(order);
                  return (
                    <div
                      key={order.id}
                      className="block rounded-lg border border-white/10 bg-white/[0.03] p-3 shadow-card transition hover:border-gold-dark/60"
                    >
                      <div className="flex items-center justify-between">
                        <a
                          href={`/admin/pedidos/${order.id}/ticket`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-gold-hover hover:underline"
                        >
                          {order.id.slice(0, 8)}
                        </a>
                        <span className="text-xs text-foreground-muted">
                          {order.delivery_method === "pickup" ? "Retiro" : "Envío"}
                        </span>
                      </div>
                      <Link
                        href={`/admin/pedidos?grupo=${key}&buscar=${order.id.slice(0, 8)}`}
                        className="mt-1 block truncate text-sm text-foreground hover:text-gold"
                      >
                        {customer?.full_name ?? "—"}
                      </Link>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-sm font-medium text-gold">{formatCLP(order.total)}</span>
                        {sla && <span className={`text-[11px] ${sla.className}`}>{sla.label}</span>}
                      </div>
                    </div>
                  );
                })}
                {columnOrders.length === 0 && (
                  <p className="rounded-lg border border-dashed border-white/10 p-3 text-center text-xs text-foreground-muted">
                    Sin pedidos
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
