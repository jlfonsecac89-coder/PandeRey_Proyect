"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatCLP } from "@/lib/format";
import { STATUS_LABELS, type OrderStatus } from "@/lib/orders/status";
import { DeliveryChatPanel } from "@/components/delivery-chat/DeliveryChatPanel";
import type { AdminOrder } from "./AdminOrderRow";
import type { OrderItemSummary } from "./OrderRowDetail";

// Popup centrado (no drawer lateral) — mismo patrón de overlay que
// ProductDrawer.tsx, pero como diálogo modal en vez de panel deslizante,
// porque acá lo que pide el pedido es "ver el detalle sin salir de la
// página", no editar algo. Se abre al hacer click en el N° de pedido, que
// antes navegaba directo a la comanda de impresión en una pestaña nueva —
// esa opción sigue disponible como link secundario dentro del modal.
export function OrderDetailModal({
  order,
  customer,
  items,
  onClose,
}: {
  order: AdminOrder;
  customer: { full_name: string; phone: string | null } | null;
  items: OrderItemSummary[];
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  function close() {
    setVisible(false);
    setTimeout(onClose, 150);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);

  // Portal a document.body: AdminOrderRow vive dentro de un <tbody>, así que
  // un overlay fixed acá adentro sería HTML inválido (un <div> hijo directo
  // de <tbody>/<tr>) — el portal lo saca del árbol de la tabla sin perder el
  // estado de React.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={close}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-150 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-white/10 bg-background-alt shadow-2xl transition-all duration-150 ${
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <div>
            <h2 className="font-display text-base font-medium text-foreground">
              Pedido #{order.id.slice(0, 8)}
            </h2>
            <p className="text-xs text-foreground-muted">
              {STATUS_LABELS[order.status as OrderStatus] ?? order.status} ·{" "}
              {new Date(order.created_at).toLocaleString("es-CL")}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar"
            className="rounded-md p-1.5 text-foreground-muted hover:bg-white/[0.05] hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Cliente</p>
            <p className="mt-1 text-sm text-foreground">{customer?.full_name ?? "—"}</p>
            {customer?.phone && <p className="text-xs text-foreground-muted">{customer.phone}</p>}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Productos</p>
            <div className="mt-2 divide-y divide-white/10 rounded-md border border-white/10">
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div>
                    <p className="text-foreground">
                      {item.quantity}× {item.product_name_snapshot}
                    </p>
                    <p className="text-xs text-foreground-muted">{formatCLP(item.unit_price)} c/u</p>
                  </div>
                  <p className="font-medium text-foreground">{formatCLP(item.subtotal)}</p>
                </div>
              ))}
              {items.length === 0 && <p className="px-3 py-2 text-sm text-foreground-muted">Sin ítems.</p>}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
            <p className="text-sm font-semibold text-foreground">Total</p>
            <p className="text-sm font-semibold text-gold">{formatCLP(order.total)}</p>
          </div>
          {total !== order.total && (
            <p className="mt-1 text-[10px] text-foreground-muted">
              Suma de productos: {formatCLP(total)} (el total del pedido puede incluir envío, descuentos o puntos)
            </p>
          )}

          {order.status === "delivery_issue" && (
            <div className="mt-4 border-t border-white/10 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                Chat con repartidor
              </p>
              <div className="mt-2">
                <DeliveryChatPanel orderId={order.id} viewerRole="tienda" />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 px-5 py-3">
          <a
            href={`/admin/pedidos/${order.id}/ticket`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gold-dark hover:text-gold hover:underline"
          >
            Ver comanda de impresión →
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}
