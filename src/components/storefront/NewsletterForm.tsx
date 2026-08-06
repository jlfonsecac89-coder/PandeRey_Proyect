"use client";

import { useActionState } from "react";
import { subscribeNewsletter, type NewsletterState } from "@/lib/newsletter/actions";

export function NewsletterForm() {
  const [state, formAction, pending] = useActionState<NewsletterState, FormData>(
    subscribeNewsletter,
    null,
  );

  return (
    <form action={formAction} className="mx-auto max-w-sm space-y-2 text-center">
      <p className="text-sm text-foreground/70">
        Enterate primero de nuevos productos y promociones.
      </p>
      <input
        type="email"
        name="email"
        placeholder="tu@email.com"
        required
        className="w-full rounded-md border border-charcoal-border bg-charcoal-light px-3 py-2 text-sm outline-none focus:border-gold"
      />
      <label className="flex items-start gap-2 text-left text-xs text-foreground/60">
        <input type="checkbox" name="consent" className="mt-0.5" />
        Quiero recibir novedades y promociones de Pan de Rey por email.
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
      >
        {pending ? "Enviando..." : "Suscribirme"}
      </button>
      {state?.error && <p className="text-xs text-red-400">{state.error}</p>}
      {state?.success && <p className="text-xs text-gold">{state.success}</p>}
    </form>
  );
}
