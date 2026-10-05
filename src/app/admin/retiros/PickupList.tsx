"use client";

import { useState, useTransition } from "react";
import { formatOrderNumber } from "@/lib/format";
import { markCampaignPickup, undoCampaignPickup, type PickupActionState } from "@/lib/campaigns/pickup-actions";

export type PickupRowData = {
  pickupId: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string | null;
  productName: string;
  quantity: number;
  pickedUpAt: string | null;
  orderClosed: boolean;
  receiptNumber: string | null;
  // Es la última parte sin retirar del pedido: marcarla cierra el pedido.
  isLastPending: boolean;
};

const TIME = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function PickupRow({ row, invoicingEnabled }: { row: PickupRowData; invoicingEnabled: boolean }) {
  const [receipt, setReceipt] = useState("");
  const [message, setMessage] = useState<PickupActionState>(null);
  const [pending, startTransition] = useTransition();
  const needsReceipt = row.isLastPending && !invoicingEnabled;

  function run(fn: () => Promise<PickupActionState>) {
    setMessage(null);
    startTransition(async () => setMessage(await fn()));
  }

  return (
    <tr className="border-b border-charcoal-border/50 align-top">
      <td className="py-2 pr-3 font-mono text-xs text-gold-dark">{formatOrderNumber(row.orderNumber)}</td>
      <td className="py-2 pr-3 text-xs">
        <p className="text-foreground/90">{row.customerName}</p>
        {row.customerPhone && <p className="text-foreground/40">{row.customerPhone}</p>}
      </td>
      <td className="py-2 pr-3 text-sm">
        {row.quantity} × {row.productName}
      </td>
      <td className="py-2 text-xs">
        {row.pickedUpAt ? (
          <div className="space-y-0.5">
            <p className="text-gold-hover">Retirado {TIME.format(new Date(row.pickedUpAt))}</p>
            {row.receiptNumber && <p className="text-foreground-muted">Boleta N° {row.receiptNumber}</p>}
            {!row.orderClosed && (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => undoCampaignPickup(row.pickupId))}
                className="text-foreground-muted underline hover:text-red-400 disabled:opacity-50"
              >
                Deshacer
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {needsReceipt && (
              <input
                value={receipt}
                onChange={(e) => setReceipt(e.target.value)}
                maxLength={20}
                placeholder="N° de boleta"
                aria-label="N° de boleta"
                className="w-28 rounded-md border border-charcoal-border bg-background px-1.5 py-1 text-xs outline-none focus:border-gold"
              />
            )}
            <button
              type="button"
              disabled={pending || (needsReceipt && !receipt.trim())}
              onClick={() => run(() => markCampaignPickup(row.pickupId, receipt))}
              className="block rounded-md bg-gold px-2 py-1 text-xs font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
            >
              {pending ? "Guardando..." : row.isLastPending ? "Marcar retirado y cerrar pedido" : "Marcar retirado"}
            </button>
          </div>
        )}
        {message?.error && <p className="mt-1 max-w-48 text-red-400">{message.error}</p>}
      </td>
    </tr>
  );
}

export function PickupList({ rows, invoicingEnabled }: { rows: PickupRowData[]; invoicingEnabled: boolean }) {
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const filtered = q
    ? rows.filter(
        (r) =>
          formatOrderNumber(r.orderNumber).toLowerCase().includes(q) ||
          String(r.orderNumber).includes(q.replace(/^pdr-?0*/, "")) ||
          r.customerName.toLowerCase().includes(q),
      )
    : rows;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por N° de pedido o cliente..."
          className="w-72 rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm outline-none focus:border-gold"
        />
        <p className="text-xs text-foreground-muted">
          {filtered.length} retiro{filtered.length === 1 ? "" : "s"}
        </p>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-charcoal-border text-xs uppercase tracking-wide text-foreground-muted">
              <th className="py-2 pr-3 font-normal">Pedido</th>
              <th className="py-2 pr-3 font-normal">Cliente</th>
              <th className="py-2 pr-3 font-normal">Retira</th>
              <th className="py-2 font-normal">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <PickupRow key={row.pickupId} row={row} invoicingEnabled={invoicingEnabled} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="mt-4 text-sm text-foreground-muted">No hay retiros para este día.</p>}
      </div>
    </div>
  );
}
