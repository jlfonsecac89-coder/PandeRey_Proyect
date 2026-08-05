"use client";

import { useActionState, useState } from "react";
import { anonymizeAccount } from "@/lib/account/actions";
import { FormMessage } from "@/components/auth/AuthCard";

export function DeleteAccountForm() {
  const [expanded, setExpanded] = useState(false);
  const [state, formAction, pending] = useActionState(anonymizeAccount, null);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="text-sm text-red-400 hover:text-red-300"
      >
        Eliminar mi cuenta
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-4">
      <p className="text-sm text-foreground/80">
        Esto elimina tus datos personales (nombre, teléfono, RUT) de forma irreversible y bloquea el acceso a esta
        cuenta. Tu historial de pedidos se conserva, sin datos personales asociados, por obligaciones legales de
        retención tributaria.
      </p>
      <form action={formAction} className="mt-3 space-y-2">
        <label htmlFor="confirmation" className="block text-xs text-foreground/60">
          Escribí <span className="font-mono text-red-400">ELIMINAR</span> para confirmar
        </label>
        <input
          id="confirmation"
          name="confirmation"
          required
          className="w-full max-w-xs rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-red-500"
        />
        <FormMessage error={state?.error} success={state?.success} />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-background hover:bg-red-400 disabled:opacity-50"
          >
            {pending ? "Eliminando..." : "Confirmar eliminación"}
          </button>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="rounded-md border border-charcoal-border px-4 py-2 text-sm text-foreground/60 hover:text-gold"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
