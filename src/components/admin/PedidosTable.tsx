"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminOrderRow, type AdminOrder } from "./AdminOrderRow";
import {
  markOrderReady,
  confirmPickup,
  confirmReturnedToStore,
  confirmBankTransferPayment,
  startPreparation,
} from "@/lib/orders/actions";

type Person = { id: string; full_name: string; phone: string | null; store_id?: string | null };
type OrderItemRow = { order_id: string; product_name_snapshot: string; quantity: number };

// Acciones masivas disponibles por estado — solo se ofrecen cuando TODOS los
// pedidos seleccionados comparten el mismo estado, porque cada transición
// tiene sus propias reglas (SLA, notificaciones) y no tiene sentido mezclarlas.
const BULK_ACTIONS: Record<string, { label: string; run: (id: string) => Promise<unknown> }> = {
  pending_payment: { label: "Confirmar pago (transferencia) de todos", run: confirmBankTransferPayment },
  paid: { label: "Iniciar preparación de todos", run: startPreparation },
  preparing: { label: "Marcar todos como preparados", run: markOrderReady },
  ready_for_pickup: { label: "Confirmar retiro de todos", run: confirmPickup },
  returning_to_store: { label: "Confirmar devolución de todos", run: confirmReturnedToStore },
};

export function PedidosTable({
  orders,
  repartidores,
  customers,
  items,
}: {
  orders: AdminOrder[];
  repartidores: Person[];
  customers: Person[];
  items: OrderItemRow[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);

  const driversByStore = useMemo(() => {
    const map = new Map<string, Person[]>();
    for (const d of repartidores) {
      if (!d.store_id) continue;
      const list = map.get(d.store_id) ?? [];
      list.push(d);
      map.set(d.store_id, list);
    }
    return map;
  }, [repartidores]);
  const driverById = useMemo(() => new Map(repartidores.map((d) => [d.id, d])), [repartidores]);
  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const itemsByOrder = useMemo(() => {
    const map = new Map<string, OrderItemRow[]>();
    for (const item of items) {
      const list = map.get(item.order_id) ?? [];
      list.push(item);
      map.set(item.order_id, list);
    }
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const customer = customerById.get(o.user_id ?? "");
      return o.id.slice(0, 8).toLowerCase().includes(q) || customer?.full_name?.toLowerCase().includes(q);
    });
  }, [orders, search, customerById]);

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const allSelected = filtered.length > 0 && filtered.every((o) => selected.has(o.id));
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(filtered.map((o) => o.id)));
  };

  const selectedOrders = filtered.filter((o) => selected.has(o.id));
  const statusesSelected = new Set(selectedOrders.map((o) => o.status));
  const commonStatus = statusesSelected.size === 1 ? [...statusesSelected][0] : null;
  // pending_payment mezcla Mercado Pago (nada que hacer, se resuelve solo o
  // se abandona) con transferencia (necesita confirmación manual) — el bulk
  // solo tiene sentido si la selección es 100% transferencia.
  const allBankTransfer = selectedOrders.every((o) => o.payment_method === "bank_transfer");
  const bulkAction =
    commonStatus && (commonStatus !== "pending_payment" || allBankTransfer) ? BULK_ACTIONS[commonStatus] : undefined;

  async function runBulk() {
    if (!bulkAction) return;
    setBulkPending(true);
    await Promise.all(selectedOrders.map((o) => bulkAction.run(o.id)));
    setBulkPending(false);
    setSelected(new Set());
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por código o cliente..."
          className="w-64 rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm outline-none focus:border-gold"
        />
        <p className="text-xs text-foreground-muted">
          {filtered.length} pedido{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      {selected.size > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-gold/30 bg-gold/5 px-4 py-2.5">
          <p className="text-sm text-foreground">{selected.size} seleccionado(s)</p>
          {bulkAction ? (
            <button
              type="button"
              onClick={runBulk}
              disabled={bulkPending}
              className="rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-ink hover:bg-gold-hover disabled:opacity-50"
            >
              {bulkPending ? "Aplicando..." : bulkAction.label}
            </button>
          ) : (
            <p className="text-xs text-foreground-muted">
              Seleccioná pedidos con el mismo estado para aplicar una acción masiva.
            </p>
          )}
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-xs text-foreground-muted hover:text-gold"
          >
            Cancelar selección
          </button>
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-charcoal-border text-xs uppercase tracking-wide text-foreground-muted">
              <th className="w-8 py-2 pr-1 font-normal">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Seleccionar todos"
                  className="h-4 w-4 accent-gold"
                />
              </th>
              <th className="py-2 pr-3 font-normal">Pedido</th>
              <th className="py-2 pr-3 font-normal">Cliente</th>
              <th className="py-2 pr-3 font-normal">Estado</th>
              <th className="py-2 pr-3 font-normal">Entrega</th>
              <th className="py-2 pr-3 font-normal">Pipeline &amp; SLA</th>
              <th className="py-2 pr-3 font-normal">Total</th>
              <th className="py-2 pr-3 font-normal">Fecha</th>
              <th className="py-2 font-normal">Acción</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
              <AdminOrderRow
                key={order.id}
                order={order}
                drivers={driversByStore.get(order.store_id) ?? []}
                customer={customerById.get(order.user_id) ?? null}
                assignedDriver={order.assigned_driver_id ? driverById.get(order.assigned_driver_id) ?? null : null}
                items={itemsByOrder.get(order.id) ?? []}
                selected={selected.has(order.id)}
                onToggleSelect={() => toggleOne(order.id)}
              />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="mt-4 text-sm text-foreground-muted">No hay pedidos que coincidan.</p>}
      </div>
    </div>
  );
}
