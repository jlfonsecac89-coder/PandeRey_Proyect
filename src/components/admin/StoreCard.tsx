"use client";

import { useActionState } from "react";
import {
  updateStoreSettings,
  toggleStoreActive,
  createShippingZone,
  updateShippingZonePrice,
  toggleShippingZoneActive,
  type StoreActionState,
} from "@/lib/stores/actions";
import { FormMessage } from "@/components/auth/AuthCard";

type ShippingZone = {
  id: string;
  min_km: number;
  max_km: number;
  price: number;
  is_active: boolean;
};

export type Store = {
  id: string;
  name: string;
  contact_address: string | null;
  max_delivery_radius_km: number;
  min_order_amount: number | null;
  free_shipping_min_amount: number | null;
  is_active: boolean;
};

export function StoreCard({ store, zones }: { store: Store; zones: ShippingZone[] }) {
  const [settingsState, settingsAction, settingsPending] = useActionState<StoreActionState, FormData>(
    (prev, formData) => updateStoreSettings(store.id, prev, formData),
    null,
  );
  const [zoneState, zoneAction, zonePending] = useActionState<StoreActionState, FormData>(
    createShippingZone,
    null,
  );

  return (
    <div className="rounded-lg border border-charcoal-border bg-charcoal-light p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gold">{store.name}</h2>
          <p className="text-xs text-foreground/50">{store.contact_address}</p>
        </div>
        <form action={toggleStoreActive.bind(null, store.id, !store.is_active)}>
          <button
            type="submit"
            className={`rounded-full px-2 py-0.5 text-xs ${store.is_active ? "border border-gold text-gold" : "border border-charcoal-border text-foreground/50"}`}
          >
            {store.is_active ? "Activa" : "Inactiva"}
          </button>
        </form>
      </div>

      <FormMessage error={settingsState?.error} success={settingsState?.success} />
      <form action={settingsAction} className="mt-3 grid grid-cols-3 gap-2">
        <label className="text-xs text-foreground/60">
          Radio máx. (km)
          <input
            name="max_delivery_radius_km"
            type="number"
            step="0.1"
            defaultValue={store.max_delivery_radius_km}
            className="mt-1 w-full rounded-md border border-charcoal-border bg-background px-2 py-1 text-sm"
          />
        </label>
        <label className="text-xs text-foreground/60">
          Mínimo de compra
          <input
            name="min_order_amount"
            type="number"
            defaultValue={store.min_order_amount ?? ""}
            className="mt-1 w-full rounded-md border border-charcoal-border bg-background px-2 py-1 text-sm"
          />
        </label>
        <label className="text-xs text-foreground/60">
          Envío gratis desde
          <input
            name="free_shipping_min_amount"
            type="number"
            defaultValue={store.free_shipping_min_amount ?? ""}
            className="mt-1 w-full rounded-md border border-charcoal-border bg-background px-2 py-1 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={settingsPending}
          className="col-span-3 rounded-md bg-gold px-3 py-1.5 text-xs font-medium text-background hover:bg-gold-hover disabled:opacity-50"
        >
          {settingsPending ? "Guardando..." : "Guardar"}
        </button>
      </form>

      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
          Tramos de envío
        </h3>
        <table className="mt-2 w-full text-xs">
          <tbody>
            {zones.map((zone) => (
              <ShippingZoneRow key={zone.id} zone={zone} />
            ))}
          </tbody>
        </table>
        {zones.length === 0 && <p className="mt-1 text-xs text-foreground/40">Sin tramos definidos.</p>}

        <FormMessage error={zoneState?.error} success={zoneState?.success} />
        <form action={zoneAction} className="mt-2 flex items-center gap-1">
          <input type="hidden" name="store_id" value={store.id} />
          <input
            name="min_km"
            type="number"
            step="0.1"
            placeholder="Desde km"
            required
            className="w-20 rounded-md border border-charcoal-border bg-background px-2 py-1"
          />
          <input
            name="max_km"
            type="number"
            step="0.1"
            placeholder="Hasta km"
            required
            className="w-20 rounded-md border border-charcoal-border bg-background px-2 py-1"
          />
          <input
            name="price"
            type="number"
            placeholder="Precio"
            required
            className="w-24 rounded-md border border-charcoal-border bg-background px-2 py-1"
          />
          <button
            type="submit"
            disabled={zonePending}
            className="rounded-md bg-gold px-2 py-1 font-medium text-background hover:bg-gold-hover disabled:opacity-50"
          >
            Agregar
          </button>
        </form>
      </div>
    </div>
  );
}

function ShippingZoneRow({ zone }: { zone: ShippingZone }) {
  const [priceState, priceAction, pricePending] = useActionState<StoreActionState, FormData>(
    (prev, formData) => updateShippingZonePrice(zone.id, prev, formData),
    null,
  );

  return (
    <tr className="border-b border-charcoal-border/50">
      <td className="py-1 pr-2 text-foreground/70">
        {zone.min_km}–{zone.max_km} km
      </td>
      <td className="py-1 pr-2">
        <form action={priceAction} className="flex items-center gap-1">
          <input
            name="price"
            type="number"
            defaultValue={zone.price}
            className="w-20 rounded-md border border-charcoal-border bg-background px-1.5 py-0.5"
          />
          <button type="submit" disabled={pricePending} className="text-gold-hover underline">
            Guardar
          </button>
        </form>
        {priceState?.error && <p className="text-red-400">{priceState.error}</p>}
      </td>
      <td className="py-1 text-right">
        <form action={toggleShippingZoneActive.bind(null, zone.id, !zone.is_active)}>
          <button
            type="submit"
            className={zone.is_active ? "text-gold" : "text-foreground/40"}
          >
            {zone.is_active ? "Activo" : "Inactivo"}
          </button>
        </form>
      </td>
    </tr>
  );
}
