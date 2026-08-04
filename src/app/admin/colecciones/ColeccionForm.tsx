"use client";

import { useActionState } from "react";
import { createCollection } from "@/lib/catalog/actions";
import { FormMessage } from "@/components/auth/AuthCard";

export function ColeccionForm() {
  const [state, formAction, pending] = useActionState(createCollection, null);

  return (
    <div className="max-w-lg">
      <FormMessage error={state?.error} success={state?.success} />
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="name" className="mb-1 block text-xs text-foreground/60">
            Nombre
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="Sin Gluten"
            className="rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>
        <div>
          <label htmlFor="starts_at" className="mb-1 block text-xs text-foreground/60">
            Inicio (opcional — solo eventos)
          </label>
          <input
            id="starts_at"
            name="starts_at"
            type="datetime-local"
            className="rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>
        <div>
          <label htmlFor="ends_at" className="mb-1 block text-xs text-foreground/60">
            Fin (opcional — solo eventos)
          </label>
          <input
            id="ends_at"
            name="ends_at"
            type="datetime-local"
            className="rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-background hover:bg-gold-hover disabled:opacity-50"
        >
          {pending ? "Creando..." : "Agregar"}
        </button>
      </form>
      <p className="mt-2 text-xs text-foreground/40">
        Dejá inicio/fin vacíos para una colección permanente (ej. &quot;Sin
        Gluten&quot;). Con fechas, se activa y desactiva sola (ej.
        &quot;Navidad&quot;).
      </p>
    </div>
  );
}
