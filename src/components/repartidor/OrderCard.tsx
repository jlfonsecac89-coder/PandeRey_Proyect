"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCLP } from "@/lib/format";
import { IssueChatPanel } from "@/app/repartidor/IssueChatPanel";
import {
  markInRoute,
  markAtAddress,
  markDeliveryIssue,
  markReturningToStore,
  confirmDeliveryCode,
  type OrderActionState,
  type ConfirmCodeState,
} from "@/lib/orders/actions";

export type RepartidorOrder = {
  id: string;
  status: string;
  total: number;
  delivery_issue_reason: string | null;
  delivery_issue_at: string | null;
  delivery_code_locked: boolean;
  customer: { full_name: string; phone: string | null } | null;
  address: { calle: string; numero: string; comuna: string; ciudad: string } | null;
};

// Segundos restantes hasta que se cumpla max_delivery_issue_wait_minutes
// desde delivery_issue_at. Null si no aplica (sin incidencia) o ya venció.
function remainingSeconds(issueAt: string | null, waitMinutes: number): number | null {
  if (!issueAt) return null;
  const deadline = new Date(issueAt).getTime() + waitMinutes * 60_000;
  const remaining = Math.ceil((deadline - Date.now()) / 1000);
  return remaining > 0 ? remaining : null;
}

function useIssueCountdown(issueAt: string | null, waitMinutes: number): number | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(() =>
    remainingSeconds(issueAt, waitMinutes),
  );

  useEffect(() => {
    if (!issueAt) return;
    // El tick vive dentro del callback del interval (no en el cuerpo del
    // efecto) para respetar react-hooks/set-state-in-effect: el efecto solo
    // se suscribe al paso del tiempo, no llama setState sincrónicamente.
    const interval = setInterval(() => {
      setSecondsLeft(remainingSeconds(issueAt, waitMinutes));
    }, 1000);
    return () => clearInterval(interval);
  }, [issueAt, waitMinutes]);

  return secondsLeft;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function OrderCard({
  order,
  issueWaitMinutes,
}: {
  order: RepartidorOrder;
  issueWaitMinutes: number;
}) {
  const [inRouteState, inRouteAction, inRoutePending] = useActionState<OrderActionState, FormData>(
    () => markInRoute(order.id),
    null,
  );
  const [atAddressState, atAddressAction, atAddressPending] = useActionState<
    OrderActionState,
    FormData
  >(() => markAtAddress(order.id), null);
  const [returningState, returningAction, returningPending] = useActionState<
    OrderActionState,
    FormData
  >(() => markReturningToStore(order.id), null);
  const [issueState, issueAction, issuePending] = useActionState<OrderActionState, FormData>(
    (_prev, formData) => markDeliveryIssue(order.id, String(formData.get("reason") || "")),
    null,
  );
  const [codeState, codeAction, codePending] = useActionState<ConfirmCodeState, FormData>(
    (_prev, formData) => confirmDeliveryCode(order.id, String(formData.get("code") || "")),
    null,
  );
  const [showIssueForm, setShowIssueForm] = useState(false);
  const issueSecondsLeft = useIssueCountdown(order.delivery_issue_at, issueWaitMinutes);

  const router = useRouter();
  // Mismo motivo que en AdminOrderRow: sin esto, el status de `order` (prop
  // del Server Component padre) queda congelado tras una transición exitosa.
  useEffect(() => {
    if (
      inRouteState?.success ||
      atAddressState?.success ||
      returningState?.success ||
      issueState?.success ||
      codeState?.success
    ) {
      router.refresh();
    }
  }, [inRouteState, atAddressState, returningState, issueState, codeState, router]);

  return (
    <div className="rounded-lg border border-charcoal-border bg-charcoal-light p-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs text-gold-dark">#{order.id.slice(0, 8)}</p>
        <p className="text-xs text-foreground/50">{formatCLP(order.total)}</p>
      </div>
      <p className="mt-1 text-sm text-foreground/90">{order.customer?.full_name ?? "Cliente"}</p>
      {order.customer?.phone && <p className="text-xs text-foreground/60">{order.customer.phone}</p>}
      {order.address && (
        <p className="text-xs text-foreground/60">
          {order.address.calle} {order.address.numero}, {order.address.comuna}, {order.address.ciudad}
        </p>
      )}
      {order.delivery_issue_reason && (
        <p className="mt-1 text-xs text-red-400">Problema: {order.delivery_issue_reason}</p>
      )}

      {order.status === "delivery_issue" && (
        <div className="mt-2">
          <IssueChatPanel orderId={order.id} />
        </div>
      )}

      <div className="mt-3 space-y-2">
        {order.status === "driver_assigned" && (
          <form action={inRouteAction}>
            {inRouteState?.error && <p className="mb-1 text-xs text-red-400">{inRouteState.error}</p>}
            <button
              type="submit"
              disabled={inRoutePending}
              className="w-full rounded-md bg-gold px-3 py-1.5 text-xs font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
            >
              {inRoutePending ? "..." : "Salir en camino"}
            </button>
          </form>
        )}

        {order.status === "in_route" && (
          <form action={atAddressAction}>
            {atAddressState?.error && <p className="mb-1 text-xs text-red-400">{atAddressState.error}</p>}
            <button
              type="submit"
              disabled={atAddressPending}
              className="w-full rounded-md bg-gold px-3 py-1.5 text-xs font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
            >
              {atAddressPending ? "..." : "Ubicación alcanzada"}
            </button>
          </form>
        )}

        {(order.status === "at_address" || order.status === "delivery_issue") && (
          <>
            <form action={codeAction} className="flex gap-2">
              <input
                name="code"
                placeholder="Código de 6 dígitos"
                maxLength={6}
                disabled={order.delivery_code_locked}
                className="flex-1 rounded-md border border-charcoal-border bg-background px-2 py-1.5 text-sm disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={codePending || order.delivery_code_locked}
                className="rounded-md bg-gold px-3 py-1.5 text-xs font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
              >
                Confirmar
              </button>
            </form>
            {codeState?.error && <p className="text-xs text-red-400">{codeState.error}</p>}
            {codeState?.success && <p className="text-xs text-gold">{codeState.success}</p>}
          </>
        )}

        {order.status === "at_address" && !showIssueForm && (
          <button
            type="button"
            onClick={() => setShowIssueForm(true)}
            className="w-full rounded-md border border-charcoal-border px-3 py-1.5 text-xs text-foreground/70 hover:border-red-400 hover:text-red-400"
          >
            Reportar problema
          </button>
        )}

        {showIssueForm && (
          <form action={issueAction} className="space-y-1">
            <select
              name="reason"
              required
              className="w-full rounded-md border border-charcoal-border bg-background px-2 py-1.5 text-xs"
            >
              <option value="">Elegí un motivo</option>
              <option value="cliente_ausente">Cliente ausente</option>
              <option value="direccion_no_ubicable">Dirección no ubicable</option>
              <option value="cliente_rechaza_pedido">Cliente rechaza el pedido</option>
            </select>
            {issueState?.error && <p className="text-xs text-red-400">{issueState.error}</p>}
            <button
              type="submit"
              disabled={issuePending}
              className="w-full rounded-md bg-red-500/80 px-3 py-1.5 text-xs font-medium text-ink hover:bg-red-500 disabled:opacity-50"
            >
              {issuePending ? "..." : "Confirmar problema"}
            </button>
          </form>
        )}

        {order.status === "delivery_issue" && (
          <form action={returningAction}>
            {returningState?.error && (
              <p className="mb-1 text-xs text-red-400">{returningState.error}</p>
            )}
            <button
              type="submit"
              disabled={returningPending || issueSecondsLeft !== null}
              className="w-full rounded-md border border-charcoal-border px-3 py-1.5 text-xs text-foreground/70 hover:border-gold-dark disabled:opacity-50"
            >
              {returningPending
                ? "..."
                : issueSecondsLeft !== null
                  ? `Volver a la tienda (${formatCountdown(issueSecondsLeft)})`
                  : "Volver a la tienda"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
