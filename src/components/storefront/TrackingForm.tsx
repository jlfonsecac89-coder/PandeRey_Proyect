"use client";

import { useActionState } from "react";
import { lookupOrder } from "@/lib/orders/tracking";
import { FormMessage } from "@/components/auth/AuthCard";

export function TrackingForm() {
  const [state, formAction, pending] = useActionState(lookupOrder, null);

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage error={state?.error} />
      <label className="block text-sm text-foreground-muted">
        Código de pedido
        <input
          name="code"
          placeholder="Ej: A1B2C3D4"
          required
          className="mt-1 w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm uppercase tracking-wider outline-none focus:border-gold-dark"
        />
      </label>
      <label className="block text-sm text-foreground-muted">
        Email de la compra
        <input
          name="email"
          type="email"
          placeholder="tu@email.com"
          required
          className="mt-1 w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold-dark"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-ink shadow-card transition hover:bg-gold-hover disabled:opacity-50"
      >
        {pending ? "Buscando..." : "Ver estado de mi pedido"}
      </button>
    </form>
  );
}
