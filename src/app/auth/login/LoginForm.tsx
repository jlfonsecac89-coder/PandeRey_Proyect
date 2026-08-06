"use client";

import { useActionState } from "react";
import { signIn, signInWithGoogle } from "@/lib/auth/actions";
import { FormMessage } from "@/components/auth/AuthCard";

export function LoginForm({ next, oauthError }: { next?: string; oauthError?: string }) {
  const [state, formAction, pending] = useActionState(signIn, null);

  return (
    <>
      <FormMessage
        error={
          state?.error ??
          (oauthError ? "No se pudo iniciar sesión con Google." : undefined)
        }
      />
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
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
            autoComplete="current-password"
            className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-gold px-3 py-2.5 text-sm font-semibold text-ink shadow-card transition hover:bg-gold-hover disabled:opacity-50"
        >
          {pending ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
      <div className="my-4 flex items-center gap-3 text-xs text-foreground/40">
        <div className="h-px flex-1 bg-charcoal-border" />o<div className="h-px flex-1 bg-charcoal-border" />
      </div>
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next ?? ""} />
        <button
          type="submit"
          className="w-full rounded-md border border-charcoal-border px-3 py-2 text-sm font-medium hover:border-gold"
        >
          Continuar con Google
        </button>
      </form>
    </>
  );
}
