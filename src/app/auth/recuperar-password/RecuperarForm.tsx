"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/lib/auth/actions";
import { FormMessage } from "@/components/auth/AuthCard";

export function RecuperarForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, null);

  if (state?.success) {
    return <FormMessage success={state.success} />;
  }

  return (
    <>
      <FormMessage error={state?.error} />
      <form action={formAction} className="space-y-4">
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
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-gold px-3 py-2 text-sm font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
        >
          {pending ? "Enviando..." : "Enviar link de recuperación"}
        </button>
      </form>
    </>
  );
}
