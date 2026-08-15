"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCLP } from "@/lib/format";
import { STATUS_LABELS, type OrderStatus } from "@/lib/orders/status";
import { PIPELINE_GROUPS, statusToGroup, type PipelineGroup } from "@/lib/orders/pipeline";
import {
  markOrderReady,
  confirmPickup,
  assignDriver,
  confirmReturnedToStore,
  confirmBankTransferPayment,
  type OrderActionState,
} from "@/lib/orders/actions";

// Pasos "normales" del pipeline (excluye problemas/cancelados, que son
// desvíos del camino feliz y se muestran aparte) — el paso "en_camino" solo
// aplica a pedidos con envío, así que se salta para retiro en tienda, igual
// que hacía el modelo de referencia (4 pasos para retiro, 5 para envío).
const PICKUP_STEPS: { key: PipelineGroup; label: string }[] = [
  { key: "pago_pendiente", label: "Recibido" },
  { key: "por_preparar", label: "Preparando" },
  { key: "listos", label: "Listo" },
  { key: "entregados", label: "Entregado" },
];
const SHIPPING_STEPS: { key: PipelineGroup; label: string }[] = [
  { key: "pago_pendiente", label: "Recibido" },
  { key: "por_preparar", label: "Preparando" },
  { key: "listos", label: "Listo" },
  { key: "en_camino", label: "En camino" },
  { key: "entregados", label: "Entregado" },
];

function PipelineStepper({ order }: { order: AdminOrder }) {
  const group = statusToGroup(order.status);
  const steps = order.delivery_method === "pickup" ? PICKUP_STEPS : SHIPPING_STEPS;
  const currentIndex = steps.findIndex((s) => s.key === group);

  if (group === "problemas" || group === "cancelados") {
    return (
      <span
        className={`inline-block rounded-full border px-2 py-0.5 text-[10px] ${
          group === "cancelados"
            ? "border-red-500/40 text-red-400"
            : "border-orange-500/40 text-orange-400"
        }`}
      >
        {PIPELINE_GROUPS[group].label}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const done = currentIndex >= 0 && i <= currentIndex;
        return (
          <span
            key={step.key}
            title={step.label}
            className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-semibold ${
              done ? "bg-gold text-ink" : "bg-white/10 text-foreground/40"
            }`}
          >
            {done ? "✓" : i + 1}
          </span>
        );
      })}
    </div>
  );
}

function slaCountdown(order: AdminOrder): { label: string; className: string } | null {
  if (!order.sla_deadline || order.status === "delivered" || order.status === "cancelled") return null;
  const minutesLeft = Math.round((new Date(order.sla_deadline).getTime() - Date.now()) / 60000);
  if (minutesLeft < 0) return { label: `Vencido hace ${Math.abs(minutesLeft)} min`, className: "text-red-400" };
  if (minutesLeft <= 10) return { label: `${minutesLeft} min`, className: "text-orange-400" };
  return { label: `${minutesLeft} min`, className: "text-foreground-muted" };
}

export type AdminOrder = {
  id: string;
  status: string;
  payment_method: "mercadopago" | "bank_transfer";
  delivery_method: "pickup" | "shipping";
  total: number;
  created_at: string;
  store_id: string;
  user_id: string;
  assigned_driver_id: string | null;
  sla_deadline: string | null;
  delivered_at: string | null;
  scheduled_at: string | null;
  ticket_printed_at: string | null;
};

type Person = { id: string; full_name: string; phone: string | null };
type OrderItemSummary = { product_name_snapshot: string; quantity: number };

export function AdminOrderRow({
  order,
  drivers,
  customer,
  assignedDriver,
  items,
  selected = false,
  onToggleSelect,
}: {
  order: AdminOrder;
  drivers: Person[];
  customer: { full_name: string; phone: string | null } | null;
  assignedDriver: Person | null;
  items: OrderItemSummary[];
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const [readyState, readyAction, readyPending] = useActionState<OrderActionState, FormData>(
    () => markOrderReady(order.id),
    null,
  );
  const [pickupState, pickupAction, pickupPending] = useActionState<OrderActionState, FormData>(
    () => confirmPickup(order.id),
    null,
  );
  const [returnState, returnAction, returnPending] = useActionState<OrderActionState, FormData>(
    () => confirmReturnedToStore(order.id),
    null,
  );
  const [assignState, assignAction, assignPending] = useActionState<OrderActionState, FormData>(
    (_prev, formData) => assignDriver(order.id, String(formData.get("driver_id") || "")),
    null,
  );
  const [transferState, transferAction, transferPending] = useActionState<OrderActionState, FormData>(
    () => confirmBankTransferPayment(order.id),
    null,
  );
  const [showItems, setShowItems] = useState(false);

  const router = useRouter();
  // `order` llega como prop del Server Component padre — sin este refresh,
  // el status queda "congelado" en el valor con el que se montó el row aunque
  // la Server Action ya haya actualizado la fila real en la DB (mismo issue
  // que en CheckoutForm: revalidatePath() no empuja los props nuevos a un
  // client component ya montado, hace falta pedirlo explícitamente).
  useEffect(() => {
    if (readyState?.success || pickupState?.success || returnState?.success || assignState?.success || transferState?.success) {
      router.refresh();
    }
  }, [readyState, pickupState, returnState, assignState, transferState, router]);

  const isOnTime =
    order.status === "delivered" && order.delivered_at && order.sla_deadline
      ? new Date(order.delivered_at) <= new Date(order.sla_deadline)
      : null;
  const sla = slaCountdown(order);

  return (
    <>
      <tr className={`border-b border-charcoal-border/50 align-top ${selected ? "bg-gold/5" : ""}`}>
        {onToggleSelect && (
          <td className="w-8 py-2 pr-1">
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              aria-label={`Seleccionar pedido ${order.id.slice(0, 8)}`}
              className="h-4 w-4 accent-gold"
            />
          </td>
        )}
        <td className="py-2 pr-3 font-mono text-xs">
          <a
            href={`/admin/pedidos/${order.id}/ticket`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold-dark hover:text-gold hover:underline"
          >
            {order.id.slice(0, 8)}
          </a>
          <button
            type="button"
            onClick={() => setShowItems((v) => !v)}
            className="mt-0.5 block text-[10px] font-sans text-foreground/40 hover:text-gold"
          >
            {items.length} producto{items.length === 1 ? "" : "s"} · {showItems ? "ocultar" : "ver detalle"}
          </button>
        </td>
        <td className="py-2 pr-3 text-xs">
          <p className="text-foreground/90">{customer?.full_name ?? "—"}</p>
          {customer?.phone && <p className="text-foreground/40">{customer.phone}</p>}
        </td>
        <td className="py-2 pr-3 text-sm">
          {STATUS_LABELS[order.status as OrderStatus] ?? order.status}
          {isOnTime !== null && (
            <span
              className={`ml-1.5 rounded-full border px-1.5 py-0.5 text-[10px] ${
                isOnTime ? "border-gold-dark text-gold-hover" : "border-red-500/60 text-red-400"
              }`}
            >
              {isOnTime ? "A tiempo" : "Fuera de plazo"}
            </span>
          )}
          {order.delivery_method === "shipping" && assignedDriver && (
            <p className="mt-1 text-xs text-foreground/50">
              Repartidor: {assignedDriver.full_name}
              {assignedDriver.phone && ` · ${assignedDriver.phone}`}
            </p>
          )}
        </td>
        <td className="py-2 pr-3 text-sm">{order.delivery_method === "pickup" ? "Retiro" : "Envío"}</td>
        <td className="py-2 pr-3">
          {order.scheduled_at && (
            <p className="text-[10px] text-foreground/50">
              Pidió para: {new Date(order.scheduled_at).toLocaleString("es-CL")}
            </p>
          )}
          <PipelineStepper order={order} />
          {sla && <p className={`mt-1 text-[10px] ${sla.className}`}>{sla.label}</p>}
          {order.ticket_printed_at && (
            <p className="mt-0.5 text-[10px] text-foreground/40">
              Comanda impresa {new Date(order.ticket_printed_at).toLocaleTimeString("es-CL")}
            </p>
          )}
        </td>
        <td className="py-2 pr-3 text-sm">{formatCLP(order.total)}</td>
        <td className="py-2 pr-3 text-xs text-foreground/50">
          {new Date(order.created_at).toLocaleString("es-CL")}
        </td>
        <td className="py-2 space-y-1">
          {order.status === "pending_payment" && order.payment_method === "bank_transfer" && (
            <form action={transferAction}>
              {transferState?.error && <p className="text-xs text-red-400">{transferState.error}</p>}
              <button
                type="submit"
                disabled={transferPending}
                className="rounded-md bg-gold px-2 py-1 text-xs font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
              >
                {transferPending ? "Confirmando..." : "Confirmar pago"}
              </button>
            </form>
          )}
          {order.status === "pending_payment" && order.payment_method === "mercadopago" && (
            <span className="text-xs text-foreground/40">Esperando pago</span>
          )}
          {order.status === "preparing" && (
            <form action={readyAction}>
              {readyState?.error && <p className="text-xs text-red-400">{readyState.error}</p>}
              <button
                type="submit"
                disabled={readyPending}
                className="rounded-md bg-gold px-2 py-1 text-xs font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
              >
                Marcar preparado
              </button>
            </form>
          )}

          {order.status === "ready" && order.delivery_method === "shipping" && (
            <form action={assignAction} className="flex gap-1">
              <select
                name="driver_id"
                required
                className="rounded-md border border-charcoal-border bg-background px-1.5 py-1 text-xs"
              >
                <option value="">Repartidor</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={assignPending}
                className="rounded-md bg-gold px-2 py-1 text-xs font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
              >
                Asignar
              </button>
              {assignState?.error && <p className="text-xs text-red-400">{assignState.error}</p>}
            </form>
          )}

          {order.status === "ready_for_pickup" && (
            <form action={pickupAction}>
              {pickupState?.error && <p className="text-xs text-red-400">{pickupState.error}</p>}
              <button
                type="submit"
                disabled={pickupPending}
                className="rounded-md bg-gold px-2 py-1 text-xs font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
              >
                Confirmar retiro
              </button>
            </form>
          )}

          {order.status === "returning_to_store" && (
            <form action={returnAction}>
              {returnState?.error && <p className="text-xs text-red-400">{returnState.error}</p>}
              <button
                type="submit"
                disabled={returnPending}
                className="rounded-md bg-gold px-2 py-1 text-xs font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
              >
                Confirmar devolución
              </button>
            </form>
          )}
        </td>
      </tr>
      {showItems && (
        <tr className="border-b border-white/10 bg-white/[0.03]">
          <td colSpan={onToggleSelect ? 9 : 8} className="py-2 pl-3 text-xs text-foreground/60">
            {items.map((item, i) => (
              <span key={i}>
                {item.quantity}× {item.product_name_snapshot}
                {i < items.length - 1 ? " · " : ""}
              </span>
            ))}
            {items.length === 0 && "Sin ítems."}
          </td>
        </tr>
      )}
    </>
  );
}
