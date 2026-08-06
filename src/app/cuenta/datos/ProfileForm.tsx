"use client";

import { useActionState } from "react";
import { updateProfileInfo, type AccountActionState } from "@/lib/account/actions";
import { FormMessage } from "@/components/auth/AuthCard";

export function ProfileForm({ fullName, phone }: { fullName: string; phone: string | null }) {
  const [state, formAction, pending] = useActionState<AccountActionState, FormData>(
    updateProfileInfo,
    null,
  );

  return (
    <div className="max-w-md">
      <FormMessage error={state?.error} success={state?.success} />
      <form action={formAction} className="space-y-3">
        <div>
          <label htmlFor="full_name" className="mb-1 block text-xs text-foreground/60">
            Nombre completo
          </label>
          <input
            id="full_name"
            name="full_name"
            defaultValue={fullName}
            required
            className="w-full rounded-md border border-charcoal-border bg-charcoal-light px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>
        <div>
          <label htmlFor="phone" className="mb-1 block text-xs text-foreground/60">
            Teléfono
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={phone ?? ""}
            placeholder="+56 9 1234 5678"
            className="w-full rounded-md border border-charcoal-border bg-charcoal-light px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}
