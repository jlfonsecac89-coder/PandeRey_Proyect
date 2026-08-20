"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { saveAddress, type CheckoutState } from "@/lib/checkout/actions";
import { deleteAddress } from "@/lib/account/actions";
import { FormMessage } from "@/components/auth/AuthCard";
import { RegionComunaFields } from "@/components/storefront/RegionComunaFields";

type Address = {
  id: string;
  label: string | null;
  calle: string;
  numero: string;
  comuna: string;
  ciudad: string;
  region: string;
  housing_type: string | null;
  depto_numero: string | null;
};

export function AddressManager({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(saveAddress, null);
  const [showForm, setShowForm] = useState(addresses.length === 0);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [housingType, setHousingType] = useState<"casa" | "departamento">("casa");

  // Mismo motivo que en CheckoutForm (Fase 4): revalidatePath() en la Server
  // Action no empuja props nuevos a este client component ya montado.
  useEffect(() => {
    if (state?.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowForm(false);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditingAddress(null);
      router.refresh();
    }
  }, [state, router]);

  function startEdit(addr: Address) {
    setEditingAddress(addr);
    setHousingType(addr.housing_type === "departamento" ? "departamento" : "casa");
    setShowForm(true);
  }

  function startCreate() {
    setEditingAddress(null);
    setHousingType("casa");
    setShowForm(true);
  }

  return (
    <div className="max-w-lg space-y-4">
      <ul className="space-y-3">
        {addresses.map((addr) => (
          <li
            key={addr.id}
            className="flex items-start justify-between gap-3 rounded-2xl border border-crust-soft bg-masa p-5 shadow-card"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/10 text-gold">
                <MapPin className="h-4 w-4" />
              </span>
              <div className="text-sm">
                {addr.label && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                    {addr.label}
                  </p>
                )}
                <p className="mt-0.5 text-foreground">
                  {addr.calle} {addr.numero}
                  {addr.housing_type === "departamento" && addr.depto_numero
                    ? `, depto. ${addr.depto_numero}`
                    : ""}
                </p>
                <p className="text-foreground-muted">
                  {addr.comuna}, {addr.ciudad}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => startEdit(addr)}
                className="text-gold-hover hover:underline"
              >
                Editar
              </button>
              <form action={deleteAddress.bind(null, addr.id)}>
                <button type="submit" className="text-burgundy-hover hover:underline">
                  Eliminar
                </button>
              </form>
            </div>
          </li>
        ))}
        {addresses.length === 0 && (
          <p className="text-sm text-foreground/50">Todavía no tenés direcciones guardadas.</p>
        )}
      </ul>

      {!showForm && (
        <button type="button" onClick={startCreate} className="text-xs text-gold-hover underline">
          Agregar dirección
        </button>
      )}

      {showForm && (
        <form
          key={editingAddress?.id ?? "new"}
          action={formAction}
          className="space-y-2 rounded-md border border-crust-soft bg-masa p-3"
        >
          <FormMessage error={state?.error} success={state?.success} />
          {editingAddress && <input type="hidden" name="address_id" value={editingAddress.id} />}
          <div className="grid grid-cols-2 gap-2">
            <input
              name="label"
              placeholder="Etiqueta (ej. Casa)"
              defaultValue={editingAddress?.label ?? ""}
              className="col-span-2 rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
            />
            <div className="col-span-2 flex gap-3 text-sm">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="housing_type"
                  value="casa"
                  checked={housingType === "casa"}
                  onChange={() => setHousingType("casa")}
                />
                Casa
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="housing_type"
                  value="departamento"
                  checked={housingType === "departamento"}
                  onChange={() => setHousingType("departamento")}
                />
                Departamento
              </label>
            </div>
            <input
              name="calle"
              placeholder="Calle"
              required
              defaultValue={editingAddress?.calle ?? ""}
              className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
            />
            <input
              name="numero"
              placeholder="Número"
              required
              defaultValue={editingAddress?.numero ?? ""}
              className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
            />
            {housingType === "departamento" && (
              <input
                name="depto_numero"
                placeholder="N.º de departamento"
                required
                defaultValue={editingAddress?.depto_numero ?? ""}
                className="col-span-2 rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
              />
            )}
            <RegionComunaFields defaultComuna={editingAddress?.comuna ?? ""} />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-gold px-4 py-1.5 text-sm font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
            >
              {pending ? "Ubicando..." : editingAddress ? "Guardar cambios" : "Guardar dirección"}
            </button>
            {editingAddress && (
              <button
                type="button"
                onClick={() => {
                  setEditingAddress(null);
                  setShowForm(false);
                }}
                className="text-xs text-foreground/50 hover:underline"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
