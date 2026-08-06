"use client";

import { useActionState } from "react";
import { createStore, type StoreActionState } from "@/lib/stores/actions";
import { FormMessage } from "@/components/auth/AuthCard";

export function NewStoreForm() {
  const [state, formAction, pending] = useActionState<StoreActionState, FormData>(createStore, null);

  return (
    <div className="max-w-md rounded-lg border border-charcoal-border bg-charcoal-light p-4">
      <h2 className="text-sm font-semibold text-gold">Nueva sucursal</h2>
      <FormMessage error={state?.error} success={state?.success} />
      <form action={formAction} className="mt-2 space-y-2">
        <input
          name="name"
          placeholder="Nombre"
          required
          className="w-full rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
        />
        <input
          name="address"
          placeholder="Dirección completa (se geocodifica automáticamente)"
          required
          className="w-full rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
        />
        <div className="grid grid-cols-3 gap-2">
          <input
            name="max_delivery_radius_km"
            type="number"
            step="0.1"
            placeholder="Radio máx. (km)"
            required
            className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
          />
          <input
            name="min_order_amount"
            type="number"
            placeholder="Mínimo de compra"
            className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
          />
          <input
            name="free_shipping_min_amount"
            type="number"
            placeholder="Envío gratis desde"
            className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            name="contact_phone"
            placeholder="Teléfono (opcional)"
            className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
          />
          <input
            name="contact_email"
            type="email"
            placeholder="Email (opcional)"
            className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gold px-4 py-1.5 text-sm font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
        >
          {pending ? "Ubicando..." : "Crear sucursal"}
        </button>
      </form>
    </div>
  );
}
