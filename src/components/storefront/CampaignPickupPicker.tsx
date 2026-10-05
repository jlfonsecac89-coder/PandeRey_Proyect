"use client";

import { Minus, Plus } from "lucide-react";
import { formatPickupDate, type CheckoutCampaign } from "@/lib/campaigns/types";

// Reparto de las unidades de un pedido de campaña entre los días de retiro.
// El cupo que se muestra es informativo: el servidor lo vuelve a verificar de
// forma atómica al pagar (otro cliente puede tomarlo mientras se elige).
export function CampaignPickupPicker({
  campaign,
  totalUnits,
  value,
  onChange,
}: {
  campaign: CheckoutCampaign;
  totalUnits: number;
  value: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
}) {
  const assigned = Object.values(value).reduce((sum, q) => sum + q, 0);
  const left = totalUnits - assigned;

  function setQty(dateId: string, quantity: number) {
    const next = { ...value };
    if (quantity <= 0) delete next[dateId];
    else next[dateId] = quantity;
    onChange(next);
  }

  return (
    <div>
      <p className="mt-1 text-xs text-foreground-muted">
        {campaign.name}: indica cuántas unidades retiras cada día. Debes repartir las {totalUnits} unidades de tu
        pedido.
      </p>

      <ul className="mt-3 divide-y divide-charcoal-border/60 rounded-lg border border-charcoal-border">
        {campaign.dates.map((d) => {
          const qty = value[d.id] ?? 0;
          const soldOut = d.remaining <= 0;
          const canAdd = !soldOut && qty < d.remaining && left > 0;
          return (
            <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium capitalize text-foreground">{formatPickupDate(d.date)}</p>
                <p className={`text-[11px] ${soldOut ? "text-burgundy-hover" : "text-foreground-muted"}`}>
                  {soldOut ? "Agotado" : `Quedan ${d.remaining} unidades`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={qty <= 0}
                  onClick={() => setQty(d.id, qty - 1)}
                  aria-label={`Quitar una unidad del ${formatPickupDate(d.date)}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-charcoal-border text-foreground-muted transition hover:border-gold-dark hover:text-gold disabled:opacity-40"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-6 text-center text-sm font-semibold text-foreground">{qty}</span>
                <button
                  type="button"
                  disabled={!canAdd}
                  onClick={() => setQty(d.id, qty + 1)}
                  aria-label={`Agregar una unidad al ${formatPickupDate(d.date)}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-charcoal-border text-foreground-muted transition hover:border-gold-dark hover:text-gold disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {campaign.dates.length === 0 && (
        <p className="mt-3 text-xs text-burgundy-hover">Por ahora no hay días de retiro disponibles.</p>
      )}

      <p className={`mt-3 text-xs ${left === 0 ? "text-gold-hover" : "text-foreground-muted"}`}>
        {left === 0
          ? `Repartiste las ${totalUnits} unidades.`
          : left > 0
            ? `Te faltan ${left} unidad${left === 1 ? "" : "es"} por asignar a un día.`
            : `Asignaste ${-left} unidad${left === -1 ? "" : "es"} de más: quita algunas.`}
      </p>
    </div>
  );
}
