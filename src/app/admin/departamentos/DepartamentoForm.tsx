"use client";

import { useActionState } from "react";
import { createDepartment } from "@/lib/catalog/actions";
import { FormMessage } from "@/components/auth/AuthCard";

export function DepartamentoForm() {
  const [state, formAction, pending] = useActionState(createDepartment, null);

  return (
    <div className="max-w-sm">
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
            placeholder="Panadería"
            className="rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>
        <div>
          <label htmlFor="code" className="mb-1 block text-xs text-foreground/60">
            Código (para SKU)
          </label>
          <input
            id="code"
            name="code"
            required
            maxLength={6}
            placeholder="PAN"
            className="w-24 rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm uppercase outline-none focus:border-gold"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
        >
          {pending ? "Creando..." : "Agregar"}
        </button>
      </form>
    </div>
  );
}
