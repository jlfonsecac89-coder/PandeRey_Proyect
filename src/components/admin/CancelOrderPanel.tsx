"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCLP } from "@/lib/format";
import { CANCEL_REASONS } from "@/lib/orders/cancel-reasons";
import { cancelOrder, retryOrderRefund, type CancelActionState } from "@/lib/orders/cancel-actions";
import type { AdminOrder } from "./AdminOrderRow";

const CANCELABLE = ["paid", "preparing", "ready", "ready_for_pickup"];

const inputClass =
  "w-full rounded-md border border-charcoal-border bg-background px-2 py-1.5 text-sm outline-none focus:border-gold";

// Cancelación y reembolso dentro del detalle del pedido. Solo el gerente (admin)
// ve las acciones: involucran dinero. El servidor vuelve a verificar el rol.
export function CancelOrderPanel({ order, canManage }: { order: AdminOrder; canManage: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [refund, setRefund] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<CancelActionState>(null);
  const [pending, startTransition] = useTransition();

  const refundable = order.payment_method === "mercadopago" && order.total > 0;

  function run(fn: () => Promise<CancelActionState>) {
    setMessage(null);
    startTransition(async () => {
      const result = await fn();
      setMessage(result);
      if (result?.success) {
        setOpen(false);
        setConfirming(false);
        router.refresh();
      }
    });
  }

  if (order.status === "cancelled") {
    return (
      <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-400">Pedido cancelado</p>
        {order.cancel_reason && <p className="mt-1 text-foreground">{order.cancel_reason}</p>}
        {order.refund_status === "requested" && (
          <p className="mt-1 text-xs text-foreground-muted">
            Reembolso de {formatCLP(Number(order.refund_amount ?? 0))} solicitado a Mercado Pago
            {order.refund_requested_at ? ` el ${new Date(order.refund_requested_at).toLocaleDateString("es-CL")}` : ""}.
            El abono al cliente no es inmediato: depende de su banco.
          </p>
        )}
        {order.refund_status === "failed" && (
          <div className="mt-2">
            <p className="text-xs text-red-400">El reembolso no se pudo solicitar a Mercado Pago.</p>
            {canManage && (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => retryOrderRefund(order.id))}
                className="mt-1.5 rounded-md bg-gold px-3 py-1 text-xs font-semibold text-ink hover:bg-gold-hover disabled:opacity-50"
              >
                {pending ? "Reintentando..." : "Reintentar reembolso"}
              </button>
            )}
          </div>
        )}
        {message?.error && <p className="mt-2 text-xs text-red-400">{message.error}</p>}
        {message?.success && <p className="mt-2 text-xs text-gold-hover">{message.success}</p>}
      </div>
    );
  }

  if (!canManage || !CANCELABLE.includes(order.status)) return null;

  return (
    <div className="mt-4 border-t border-white/10 pt-3">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md border border-charcoal-border px-3 py-1.5 text-xs text-foreground-muted hover:border-red-400 hover:text-red-400"
        >
          Cancelar pedido…
        </button>
      ) : (
        <div className="space-y-2 rounded-md border border-red-500/30 bg-red-500/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-400">Cancelar pedido</p>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} aria-label="Motivo">
            <option value="">Motivo de la cancelación...</option>
            {Object.entries(CANCEL_REASONS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="Detalle (opcional)"
            className={inputClass}
          />
          {refundable ? (
            <label className="flex items-start gap-2 text-xs text-foreground">
              <input type="checkbox" checked={refund} onChange={(e) => setRefund(e.target.checked)} className="mt-0.5 accent-gold" />
              <span>
                Reembolsar {formatCLP(order.total)} por Mercado Pago.
                <span className="block text-foreground-muted">
                  No es inmediato: se solicita ahora y el cliente lo ve según su banco.
                </span>
              </span>
            </label>
          ) : (
            <p className="text-xs text-foreground-muted">Este pedido no tiene un pago de Mercado Pago que reembolsar.</p>
          )}
          {message?.error && <p className="text-xs text-red-400">{message.error}</p>}
          <div className="flex gap-2">
            {!confirming ? (
              <button
                type="button"
                disabled={!reason}
                onClick={() => setConfirming(true)}
                className="rounded-md bg-red-500/80 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-red-500 disabled:opacity-50"
              >
                Cancelar pedido
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => cancelOrder(order.id, reason, note, refundable && refund))}
                className="rounded-md bg-red-500 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-red-400 disabled:opacity-50"
              >
                {pending ? "Cancelando..." : "Sí, cancelar definitivamente"}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirming(false);
                setMessage(null);
              }}
              className="rounded-md border border-charcoal-border px-3 py-1.5 text-xs text-foreground-muted"
            >
              Volver
            </button>
          </div>
        </div>
      )}
      {message?.success && <p className="mt-2 text-xs text-gold-hover">{message.success}</p>}
    </div>
  );
}
