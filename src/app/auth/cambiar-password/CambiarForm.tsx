"use client";

import { useActionState } from "react";
import { changePasswordFirstLogin } from "@/lib/auth/actions";
import { FormMessage } from "@/components/auth/AuthCard";

export function CambiarForm() {
  const [state, formAction, pending] = useActionState(changePasswordFirstLogin, null);

  return (
    <>
      <FormMessage error={state?.error} />
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="password" className="mb-1 block text-sm text-foreground/70">
            Nueva contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          />
          <p className="mt-1 text-xs text-foreground/40">
            Mínimo 10 caracteres, con al menos una letra y un número.
          </p>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-gold px-3 py-2 text-sm font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Guardar y continuar"}
        </button>
      </form>
    </>
  );
}
