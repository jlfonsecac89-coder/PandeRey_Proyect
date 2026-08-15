"use client";

import { useActionState } from "react";
import { updateSystemSettings } from "@/lib/settings/actions";
import type { SystemSettings } from "@/lib/settings/system-settings";
import { FormMessage } from "@/components/auth/AuthCard";

export function SistemaForm({ settings }: { settings: SystemSettings }) {
  const [state, formAction, pending] = useActionState(updateSystemSettings, null);

  return (
    <form action={formAction} className="space-y-6">
      <FormMessage error={state?.error} success={state?.success} />

      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">Comanda y preparación</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="orderPrepSlaMinutes" className="mb-1 block text-xs text-foreground/60">
              SLA de preparación (minutos)
            </label>
            <input
              id="orderPrepSlaMinutes"
              name="orderPrepSlaMinutes"
              type="number"
              min={1}
              max={240}
              defaultValue={settings.orderPrepSlaMinutes}
              required
              className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
            />
            <p className="mt-1 text-xs text-foreground/40">
              Cuánto tiempo tiene la cocina desde que se imprime la comanda hasta que el pedido debe estar listo.
            </p>
          </div>
          <div>
            <label htmlFor="maxDeliveryIssueWaitMinutes" className="mb-1 block text-xs text-foreground/60">
              Espera máxima en problema de entrega (minutos)
            </label>
            <input
              id="maxDeliveryIssueWaitMinutes"
              name="maxDeliveryIssueWaitMinutes"
              type="number"
              min={1}
              max={120}
              defaultValue={settings.maxDeliveryIssueWaitMinutes}
              required
              className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
            />
            <p className="mt-1 text-xs text-foreground/40">
              Antes de este tiempo, el repartidor no puede marcar &quot;volviendo a la tienda&quot; tras un
              problema de entrega.
            </p>
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">Programa de lealtad</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="loyaltyPointsPerClp" className="mb-1 block text-xs text-foreground/60">
              Puntos ganados por CLP gastado
            </label>
            <input
              id="loyaltyPointsPerClp"
              name="loyaltyPointsPerClp"
              type="number"
              min={0}
              max={1}
              step="0.0001"
              defaultValue={settings.loyaltyPointsPerClp}
              required
              className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
            />
            <p className="mt-1 text-xs text-foreground/40">
              Ej. 0.001 = 1 punto cada $1.000 comprados.
            </p>
          </div>
          <div>
            <label htmlFor="loyaltyPointsToClpRate" className="mb-1 block text-xs text-foreground/60">
              Valor en CLP de 1 punto al canjear
            </label>
            <input
              id="loyaltyPointsToClpRate"
              name="loyaltyPointsToClpRate"
              type="number"
              min={0}
              max={1000}
              step="1"
              defaultValue={settings.loyaltyPointsToClpRate}
              required
              className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
            />
            <p className="mt-1 text-xs text-foreground/40">Ej. 10 = cada punto vale $10 de descuento.</p>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
      >
        {pending ? "Guardando..." : "Guardar ajustes"}
      </button>
    </form>
  );
}
