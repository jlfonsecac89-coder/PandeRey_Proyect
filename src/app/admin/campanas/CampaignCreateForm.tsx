"use client";

import { useActionState } from "react";
import { createCampaign, type CampaignActionState } from "@/lib/campaigns/actions";

const inputClass =
  "w-full rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm outline-none focus:border-gold";

export function CampaignCreateForm({ products }: { products: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<CampaignActionState, FormData>(createCampaign, null);

  return (
    <form action={action} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="text-xs text-foreground-muted">
        Nombre
        <input name="name" required placeholder="Pan de Jamón Navidad 2026" className={`mt-1 ${inputClass}`} />
      </label>
      <label className="text-xs text-foreground-muted">
        Producto
        <select name="product_id" required defaultValue="" className={`mt-1 ${inputClass}`}>
          <option value="" disabled>
            Elige un producto...
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-foreground-muted">
        Apertura de pedidos (hora de Chile)
        <input type="datetime-local" name="orders_open_at" required className={`mt-1 ${inputClass}`} />
      </label>
      <label className="text-xs text-foreground-muted">
        Cierre de pedidos (hora de Chile)
        <input type="datetime-local" name="orders_close_at" required className={`mt-1 ${inputClass}`} />
      </label>
      <div className="sm:col-span-2">
        {state?.error && <p className="mb-2 text-sm text-burgundy-hover">{state.error}</p>}
        {state?.success && <p className="mb-2 text-sm text-gold-hover">{state.success}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gold px-4 py-1.5 text-sm font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
        >
          {pending ? "Creando..." : "Crear campaña"}
        </button>
      </div>
    </form>
  );
}
