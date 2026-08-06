"use client";

import { useActionState } from "react";
import { adminSignIn } from "@/lib/auth/admin-actions";
import { FormMessage } from "@/components/auth/AuthCard";

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(adminSignIn, null);

  return (
    <>
      <FormMessage error={state?.error} />
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="username" className="mb-1 block text-sm text-foreground/70">
            Usuario
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            required
            className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm text-foreground/70">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-gold px-3 py-2.5 text-sm font-semibold text-ink shadow-card transition hover:bg-gold-hover disabled:opacity-50"
        >
          {pending ? "Ingresando..." : "Ingresar al panel"}
        </button>
      </form>
    </>
  );
}
