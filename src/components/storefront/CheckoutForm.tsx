"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart/CartContext";
import { cartItemUnitPrice } from "@/lib/cart/types";
import { formatCLP, splitIva } from "@/lib/format";
import { RegionComunaFields } from "./RegionComunaFields";
import {
  createCheckoutPreference,
  previewShipping,
  saveAddress,
  type CheckoutState,
  type ShippingPreviewState,
} from "@/lib/checkout/actions";

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

type Store = {
  id: string;
  name: string;
  contact_address: string | null;
  min_order_amount: number | null;
  free_shipping_min_amount: number | null;
};

export function CheckoutForm({
  addresses,
  stores,
  pointsBalance,
  pointsToClpRate,
}: {
  addresses: Address[];
  stores: Store[];
  pointsBalance: number;
  pointsToClpRate: number;
}) {
  const router = useRouter();
  const { items, hydrated, subtotal } = useCart();
  const [couponCode, setCouponCode] = useState("");
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  useEffect(() => {
    if (hydrated && items.length === 0) router.replace("/carrito");
  }, [hydrated, items.length, router]);

  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "shipping">("pickup");
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [addressId, setAddressId] = useState(addresses[0]?.id ?? "");
  const [addingAddress, setAddingAddress] = useState(addresses.length === 0);
  const [scheduledAt, setScheduledAt] = useState("");
  const [housingType, setHousingType] = useState<"casa" | "departamento">("casa");

  // `addresses` llega como prop del Server Component padre — cuando se agrega
  // una dirección nueva y router.refresh() la trae, este componente no se
  // remonta (mismo estado de cliente), así que hay que re-sincronizar
  // manualmente la selección si la actual ya no está en la lista (o todavía
  // no había ninguna).
  useEffect(() => {
    if (addresses.length > 0 && !addresses.some((a) => a.id === addressId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAddressId(addresses[0].id);
    }
  }, [addresses, addressId]);

  const [addressState, addressAction, addressPending] = useActionState<CheckoutState, FormData>(
    saveAddress,
    null,
  );
  const [shippingState, shippingAction, shippingPending] = useActionState<
    ShippingPreviewState,
    FormData
  >(previewShipping, null);
  const [checkoutState, checkoutAction, checkoutPending] = useActionState<CheckoutState, FormData>(
    createCheckoutPreference,
    null,
  );

  // useActionState no expone un callback "onSuccess" — reaccionar acá al
  // cambio de resultado de la Server Action (cerrar el form + refrescar la
  // lista de direcciones del Server Component padre) es el único lugar donde
  // puede vivir esta lógica.
  useEffect(() => {
    if (addressState?.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAddingAddress(false);
      if (addressState.addressId) {
        setAddressId(addressState.addressId);
      }
      router.refresh();
    }
  }, [addressState, router]);

  const selectedStore = stores.find((s) => s.id === storeId) ?? null;
  const shippingQuote = shippingState && "ok" in shippingState ? shippingState : null;
  const shippingCost = shippingQuote?.shippingCost ?? 0;
  const totalBeforeDiscounts = subtotal + (deliveryMethod === "shipping" ? shippingCost : 0);
  // Estimación solo para mostrar en pantalla — el servidor recalcula todo de
  // nuevo (saldo real, cupón real) antes de crear el pedido.
  const estimatedPointsDiscount = Math.floor(pointsToRedeem * pointsToClpRate);
  const total = Math.max(totalBeforeDiscounts - estimatedPointsDiscount, 0);

  if (!hydrated || items.length === 0) return null;

  return (
    <div className="space-y-8">
      {/* Resumen */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
          Resumen
        </h2>
        <ul className="mt-2 space-y-1 text-sm text-foreground/70">
          {items.map((item) => {
            const lineTotal = cartItemUnitPrice(item) * item.quantity;
            const { neto } = splitIva(lineTotal);
            return (
              <li key={item.key} className="flex justify-between gap-4">
                <span>
                  {item.quantity}× {item.name}
                </span>
                <span className="shrink-0 text-foreground/50">{formatCLP(neto)} + IVA</span>
              </li>
            );
          })}
        </ul>
        <div className="mt-2 space-y-1 border-t border-charcoal-border pt-2 text-sm">
          <div className="flex justify-between">
            <span className="text-foreground/70">Neto</span>
            <span className="text-foreground/90">{formatCLP(splitIva(subtotal).neto)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground/70">IVA (19%)</span>
            <span className="text-foreground/90">{formatCLP(splitIva(subtotal).iva)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span className="text-foreground/80">Subtotal</span>
            <span className="text-foreground/90">{formatCLP(subtotal)}</span>
          </div>
        </div>
      </section>

      {/* Método de entrega */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
          Método de entrega
        </h2>
        <div className="mt-2 flex gap-3">
          <button
            type="button"
            onClick={() => setDeliveryMethod("pickup")}
            className={`rounded-md border px-4 py-2 text-sm ${deliveryMethod === "pickup" ? "border-gold text-gold" : "border-charcoal-border text-foreground/70"}`}
          >
            Retiro en tienda
          </button>
          <button
            type="button"
            onClick={() => setDeliveryMethod("shipping")}
            className={`rounded-md border px-4 py-2 text-sm ${deliveryMethod === "shipping" ? "border-gold text-gold" : "border-charcoal-border text-foreground/70"}`}
          >
            Despacho a domicilio
          </button>
        </div>
      </section>

      {/* Sucursal */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
          Sucursal
        </h2>
        {stores.length === 0 && (
          <p className="mt-2 text-sm text-red-400">
            No hay sucursales activas todavía — no se puede continuar con el checkout.
          </p>
        )}
        <div className="mt-2 space-y-2">
          {stores.map((store) => (
            <label
              key={store.id}
              className="flex items-center gap-2 rounded-md border border-charcoal-border p-3 text-sm has-[:checked]:border-gold"
            >
              <input
                type="radio"
                name="store_radio"
                checked={storeId === store.id}
                onChange={() => setStoreId(store.id)}
              />
              <span>
                {store.name}
                {store.contact_address && (
                  <span className="block text-xs text-foreground/50">{store.contact_address}</span>
                )}
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* Dirección (solo envío) */}
      {deliveryMethod === "shipping" && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
            Dirección de despacho
          </h2>

          {!addingAddress && addresses.length > 0 && (
            <div className="mt-2 space-y-2">
              {addresses.map((addr) => (
                <label
                  key={addr.id}
                  className="flex items-center gap-2 rounded-md border border-charcoal-border p-3 text-sm has-[:checked]:border-gold"
                >
                  <input
                    type="radio"
                    name="address_radio"
                    checked={addressId === addr.id}
                    onChange={() => setAddressId(addr.id)}
                  />
                  <span>
                    {addr.label && <span className="text-gold-dark">{addr.label}: </span>}
                    {addr.calle} {addr.numero}
                    {addr.housing_type === "departamento" && addr.depto_numero
                      ? `, depto. ${addr.depto_numero}`
                      : ""}
                    , {addr.comuna}, {addr.ciudad}
                  </span>
                </label>
              ))}
              <button
                type="button"
                onClick={() => setAddingAddress(true)}
                className="text-xs text-gold-hover underline"
              >
                Agregar otra dirección
              </button>
            </div>
          )}

          {addingAddress && (
            <form action={addressAction} className="mt-2 space-y-2">
              {addressState?.error && <p className="text-sm text-red-400">{addressState.error}</p>}
              <div className="grid grid-cols-2 gap-2">
                <input
                  name="label"
                  placeholder="Nombre de la dirección (ej. Casa)"
                  className="col-span-2 rounded-md border border-charcoal-border bg-charcoal-light px-3 py-1.5 text-sm"
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
                  className="rounded-md border border-charcoal-border bg-charcoal-light px-3 py-1.5 text-sm"
                />
                <input
                  name="numero"
                  placeholder="Número"
                  required
                  className="rounded-md border border-charcoal-border bg-charcoal-light px-3 py-1.5 text-sm"
                />
                {housingType === "departamento" && (
                  <input
                    name="depto_numero"
                    placeholder="N.º de departamento"
                    required
                    className="col-span-2 rounded-md border border-charcoal-border bg-charcoal-light px-3 py-1.5 text-sm"
                  />
                )}

                <RegionComunaFields />

                <input
                  name="ciudad"
                  placeholder="Ciudad"
                  required
                  className="rounded-md border border-charcoal-border bg-charcoal-light px-3 py-1.5 text-sm"
                />
                <input
                  name="codigo_postal"
                  placeholder="Código postal (opcional)"
                  className="rounded-md border border-charcoal-border bg-charcoal-light px-3 py-1.5 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={addressPending}
                  className="rounded-md bg-gold px-4 py-1.5 text-sm font-medium text-background hover:bg-gold-hover disabled:opacity-50"
                >
                  {addressPending ? "Ubicando..." : "Guardar dirección"}
                </button>
                {addresses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAddingAddress(false)}
                    className="rounded-md border border-charcoal-border px-4 py-1.5 text-sm text-foreground/70"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          )}
        </section>
      )}

      {/* Programar */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
          Fecha y hora (opcional)
        </h2>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="mt-2 rounded-md border border-charcoal-border bg-charcoal-light px-3 py-1.5 text-sm"
        />
      </section>

      {/* Previsualizar envío */}
      {deliveryMethod === "shipping" && (
        <form action={shippingAction}>
          <input type="hidden" name="store_id" value={storeId} />
          <input type="hidden" name="delivery_method" value={deliveryMethod} />
          <input type="hidden" name="address_id" value={addressId} />
          <input type="hidden" name="subtotal" value={subtotal} />
          <button
            type="submit"
            disabled={shippingPending || !addressId}
            className="rounded-md border border-gold-dark px-4 py-1.5 text-sm text-gold-hover disabled:opacity-50"
          >
            {shippingPending ? "Calculando..." : "Calcular envío"}
          </button>
          {shippingState && "error" in shippingState && (
            <p className="mt-2 text-sm text-red-400">{shippingState.error}</p>
          )}
          {shippingQuote && (
            <p className="mt-2 text-sm text-foreground/70">
              Distancia: {shippingQuote.distanceKm?.toFixed(1)} km — Envío:{" "}
              <span className="text-gold">{formatCLP(shippingQuote.shippingCost)}</span>
            </p>
          )}
        </form>
      )}

      {/* Cupón y puntos */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
          Cupón y puntos
        </h2>
        <div className="mt-2 space-y-3">
          <input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Código de cupón (opcional)"
            className="w-full rounded-md border border-charcoal-border bg-charcoal-light px-3 py-1.5 text-sm uppercase"
          />
          {pointsBalance > 0 && (
            <div>
              <label className="text-xs text-foreground/60">
                Tenés {pointsBalance} puntos disponibles ({formatCLP(pointsBalance * pointsToClpRate)})
              </label>
              <input
                type="number"
                min={0}
                max={pointsBalance}
                value={pointsToRedeem || ""}
                onChange={(e) =>
                  setPointsToRedeem(Math.min(pointsBalance, Math.max(0, Number(e.target.value) || 0)))
                }
                placeholder="Puntos a canjear"
                className="mt-1 w-full rounded-md border border-charcoal-border bg-charcoal-light px-3 py-1.5 text-sm"
              />
              {pointsToRedeem > 0 && (
                <p className="mt-1 text-xs text-foreground/50">
                  Descuento estimado: {formatCLP(estimatedPointsDiscount)}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Total y confirmación */}
      <section className="border-t border-charcoal-border pt-4">
        <div className="flex justify-between text-lg font-semibold">
          <span className="text-foreground/80">Total</span>
          <span className="text-gold">{formatCLP(total)}</span>
        </div>
        <p className="text-right text-xs text-foreground/40">IVA incluido{deliveryMethod === "shipping" && shippingCost > 0 ? " · envío incluido" : ""}</p>
        {selectedStore?.min_order_amount != null && subtotal < selectedStore.min_order_amount && (
          <p className="mt-2 text-sm text-red-400">
            El pedido mínimo para esta sucursal es {formatCLP(selectedStore.min_order_amount)}.
          </p>
        )}

        <form action={checkoutAction} className="mt-4">
          <input type="hidden" name="cart_items" value={JSON.stringify(items)} />
          <input type="hidden" name="delivery_method" value={deliveryMethod} />
          <input type="hidden" name="store_id" value={storeId} />
          <input type="hidden" name="address_id" value={deliveryMethod === "shipping" ? addressId : ""} />
          <input
            type="hidden"
            name="scheduled_at"
            value={scheduledAt ? new Date(scheduledAt).toISOString() : ""}
          />
          <input type="hidden" name="coupon_code" value={couponCode} />
          <input type="hidden" name="points_to_redeem" value={pointsToRedeem} />
          {checkoutState?.error && <p className="mb-2 text-sm text-red-400">{checkoutState.error}</p>}
          <button
            type="submit"
            disabled={
              checkoutPending ||
              !storeId ||
              (deliveryMethod === "shipping" && !addressId)
            }
            className="w-full rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-background hover:bg-gold-hover disabled:opacity-50"
          >
            {checkoutPending ? "Redirigiendo a Mercado Pago..." : "Pagar con Mercado Pago"}
          </button>
        </form>
      </section>
    </div>
  );
}
