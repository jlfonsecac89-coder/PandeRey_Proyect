"use client";

import { useActionState } from "react";
import { createStaffUser } from "@/lib/auth/actions";
import { FormMessage } from "@/components/auth/AuthCard";

type Store = { id: string; name: string };

export function UsuarioForm({ stores }: { stores: Store[] }) {
  const [state, formAction, pending] = useActionState(createStaffUser, null);

  return (
    <div className="max-w-md">
      <FormMessage error={state?.error} success={state?.success} />
      {state?.tempPassword && (
        <div className="mb-4 rounded-md border border-gold/30 bg-gold/5 p-3 text-sm">
          <p className="text-foreground/70">
            Contraseña temporal — compartila una sola vez, no se vuelve a mostrar:
          </p>
          <p className="mt-1 font-mono text-gold">{state.tempPassword}</p>
        </div>
      )}
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="full_name" className="mb-1 block text-sm text-foreground/70">
            Nombre completo
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm text-foreground/70">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>
        <div>
          <label htmlFor="role" className="mb-1 block text-sm text-foreground/70">
            Rol
          </label>
          <select
            id="role"
            name="role"
            required
            defaultValue=""
            className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          >
            <option value="" disabled>
              Elegir...
            </option>
            <option value="marketing">Marketing</option>
            <option value="operaciones">Operaciones</option>
            <option value="repartidor">Repartidor</option>
          </select>
          <p className="mt-1 text-xs text-foreground/40">
            No existe la opción &quot;Admin&quot; — esas cuentas se crean solo
            manualmente en Supabase (sección 08 del blueprint).
          </p>
        </div>
        <div>
          <label htmlFor="store_id" className="mb-1 block text-sm text-foreground/70">
            Sucursal (obligatoria para Operaciones/Repartidor)
          </label>
          <select
            id="store_id"
            name="store_id"
            defaultValue=""
            className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          >
            <option value="">Sin asignar</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-gold px-3 py-2 text-sm font-medium text-background hover:bg-gold-hover disabled:opacity-50"
        >
          {pending ? "Creando..." : "Crear cuenta de staff"}
        </button>
      </form>
    </div>
  );
}
