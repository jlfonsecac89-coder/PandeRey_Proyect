"use client";

import { useActionState } from "react";
import { signUp } from "@/lib/auth/actions";
import { FormMessage } from "@/components/auth/AuthCard";

export function RegistroForm() {
  const [state, formAction, pending] = useActionState(signUp, null);

  return (
    <>
      <FormMessage error={state?.error} />
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
            autoComplete="name"
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
            autoComplete="email"
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
            required
            minLength={10}
            autoComplete="new-password"
            className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          />
          <p className="mt-1 text-xs text-foreground/40">
            Mínimo 10 caracteres, con al menos una letra y un número.
          </p>
        </div>
        <label className="flex items-start gap-2 text-xs text-foreground/60">
          <input type="checkbox" name="accept_terms" required className="mt-0.5" />
          <span>
            Acepto los{" "}
            <a href="/terminos" className="text-gold-dark hover:text-gold-hover">
              Términos y Condiciones
            </a>
            .
          </span>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-gold px-3 py-2 text-sm font-medium text-background hover:bg-gold-hover disabled:opacity-50"
        >
          {pending ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>
    </>
  );
}
