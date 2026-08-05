"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveAddress, type CheckoutState } from "@/lib/checkout/actions";
import { deleteAddress } from "@/lib/account/actions";
import { FormMessage } from "@/components/auth/AuthCard";

type Address = {
  id: string;
  label: string | null;
  calle: string;
  numero: string;
  comuna: string;
  ciudad: string;
  region: string;
};

export function AddressManager({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(saveAddress, null);
  const [showForm, setShowForm] = useState(addresses.length === 0);

  // Mismo motivo que en CheckoutForm (Fase 4): revalidatePath() en la Server
  // Action no empuja props nuevos a este client component ya montado.
  useEffect(() => {
    if (state?.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowForm(false);
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="max-w-lg space-y-4">
      <ul className="space-y-2">
        {addresses.map((addr) => (
          <li
            key={addr.id}
            className="flex items-center justify-between rounded-md border border-charcoal-border bg-charcoal-light p-3 text-sm"
          >
            <span>
              {addr.label && <span className="text-gold-dark">{addr.label}: </span>}
              {addr.calle} {addr.numero}, {addr.comuna}, {addr.ciudad}
            </span>
            <form action={deleteAddress.bind(null, addr.id)}>
              <button type="submit" className="text-xs text-red-400 hover:underline">
                Eliminar
              </button>
            </form>
          </li>
        ))}
        {addresses.length === 0 && (
          <p className="text-sm text-foreground/50">Todavía no tenés direcciones guardadas.</p>
        )}
      </ul>

      {!showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="text-xs text-gold-hover underline"
        >
          Agregar dirección
        </button>
      )}

      {showForm && (
        <form action={formAction} className="space-y-2 rounded-md border border-charcoal-border bg-charcoal-light p-3">
          <FormMessage error={state?.error} success={state?.success} />
          <div className="grid grid-cols-2 gap-2">
            <input
              name="label"
              placeholder="Etiqueta (ej. Casa)"
              className="col-span-2 rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
            />
            <input
              name="calle"
              placeholder="Calle"
              required
              className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
            />
            <input
              name="numero"
              placeholder="Número"
              required
              className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
            />
            <input
              name="comuna"
              placeholder="Comuna"
              required
              className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
            />
            <input
              name="ciudad"
              placeholder="Ciudad"
              required
              className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
            />
            <input
              name="region"
              placeholder="Región"
              required
              className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
            />
            <input
              name="codigo_postal"
              placeholder="Código postal (opcional)"
              className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-gold px-4 py-1.5 text-sm font-medium text-background hover:bg-gold-hover disabled:opacity-50"
          >
            {pending ? "Ubicando..." : "Guardar dirección"}
          </button>
        </form>
      )}
    </div>
  );
}
