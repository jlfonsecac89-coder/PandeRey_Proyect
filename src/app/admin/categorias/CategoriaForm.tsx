"use client";

import { useActionState } from "react";
import { createCategory } from "@/lib/catalog/actions";
import { FormMessage } from "@/components/auth/AuthCard";

type Department = { id: string; name: string };

export function CategoriaForm({ departments }: { departments: Department[] }) {
  const [state, formAction, pending] = useActionState(createCategory, null);

  return (
    <div className="max-w-lg">
      <FormMessage error={state?.error} success={state?.success} />
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="department_id" className="mb-1 block text-xs text-foreground/60">
            Departamento
          </label>
          <select
            id="department_id"
            name="department_id"
            required
            defaultValue=""
            className="rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          >
            <option value="" disabled>
              Elegir...
            </option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="name" className="mb-1 block text-xs text-foreground/60">
            Nombre
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="Pan Amasado"
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
            placeholder="AMB"
            className="w-24 rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm uppercase outline-none focus:border-gold"
          />
        </div>
        <button
          type="submit"
          disabled={pending || departments.length === 0}
          className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-background hover:bg-gold-hover disabled:opacity-50"
        >
          {pending ? "Creando..." : "Agregar"}
        </button>
      </form>
      {departments.length === 0 && (
        <p className="mt-2 text-xs text-foreground/40">
          Primero creá al menos un departamento.
        </p>
      )}
    </div>
  );
}
