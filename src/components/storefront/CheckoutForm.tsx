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

type Step = "entrega" | "programar" | "pago";
const STEPS: { key: Step; label: string }[] = [
  { key: "entrega", label: "Entrega" },
  { key: "programar", label: "Fecha y hora" },
  { key: "pago", label: "Pago" },
];

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
  const [step, setStep] = useState<Step>("entrega");

  useEffect(() => {
    if (hydrated && items.length === 0) router.replace("/carrito");
  }, [hydrated, items.length, router]);

  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "shipping">("pickup");
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [addressId, setAddressId] = useState(addresses[0]?.id ?? "");
  const [addingAddress, setAddingAddress] = useState(addresses.length === 0);
  const [scheduledAt, setScheduledAt] = useState("");
  const [housingType, setHousingType] = useState<"casa" | "departamento">("casa");
  const [paymentMethod, setPaymentMethod] = useState<"mercadopago" | "bank_transfer">("mercadopago");

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

  // Chequeo automático de cobertura: apenas hay sucursal + dirección
  // elegidas (envío) se dispara solo, sin que el cliente tenga que apretar
  // un botón de "calcular" — así ve enseguida si llegamos o no.
  useEffect(() => {
    if (deliveryMethod !== "shipping" || !storeId || !addressId) return;
    const fd = new FormData();
    fd.set("store_id", storeId);
    fd.set("delivery_method", "shipping");
    fd.set("address_id", addressId);
    fd.set("subtotal", String(subtotal));
    shippingAction(fd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryMethod, storeId, addressId, subtotal]);

  const selectedStore = stores.find((s) => s.id === storeId) ?? null;
  const shippingQuote = shippingState && "ok" in shippingState ? shippingState : null;
  const shippingError = shippingState && "error" in shippingState ? shippingState.error : null;
  const shippingCost = shippingQuote?.shippingCost ?? 0;
  const shippingKnown = deliveryMethod === "pickup" || !!shippingQuote;
  const totalBeforeDiscounts = subtotal + (deliveryMethod === "shipping" ? shippingCost : 0);
  const estimatedPointsDiscount = Math.floor(pointsToRedeem * pointsToClpRate);
  const total = Math.max(totalBeforeDiscounts - estimatedPointsDiscount, 0);

  const canLeaveEntrega =
    !!storeId &&
    (deliveryMethod === "pickup" || (!!addressId && !!shippingQuote && !shippingError));

  if (!hydrated || items.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
      {/* Columna izquierda: proceso por etapas */}
      <div className="rounded-2xl border border-charcoal-border bg-background-elevated p-6 shadow-card sm:p-8">
        <ol className="flex items-center gap-2 text-xs">
          {STEPS.map((s, i) => {
            const isActive = step === s.key;
            const isDone = STEPS.findIndex((x) => x.key === step) > i;
            return (
              <li key={s.key} className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold ${
                    isActive
                      ? "border-gold bg-gold text-ink"
                      : isDone
                        ? "border-gold-dark text-gold-dark"
                        : "border-charcoal-border text-foreground-muted"
                  }`}
                >
                  {i + 1}
                </span>
                <span className={isActive ? "font-medium text-foreground" : "text-foreground-muted"}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-charcoal-border" />}
              </li>
            );
          })}
        </ol>

        {/* Paso 1: entrega */}
        {step === "entrega" && (
          <div className="mt-6 space-y-6">
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">
                Método de entrega
              </h2>
              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeliveryMethod("pickup")}
                  className={`rounded-md border px-4 py-2 text-sm ${deliveryMethod === "pickup" ? "border-gold text-gold" : "border-charcoal-border text-foreground-muted"}`}
                >
                  Retiro en tienda
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMethod("shipping")}
                  className={`rounded-md border px-4 py-2 text-sm ${deliveryMethod === "shipping" ? "border-gold text-gold" : "border-charcoal-border text-foreground-muted"}`}
                >
                  Despacho a domicilio
                </button>
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">Sucursal</h2>
              {stores.length === 0 && (
                <p className="mt-2 text-sm text-burgundy-hover">
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
                        <span className="block text-xs text-foreground-muted">{store.contact_address}</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            {deliveryMethod === "shipping" && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">
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
                          {addr.label && <span className="font-medium text-gold-dark">{addr.label}: </span>}
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

                {/* Cobertura — se calcula solo apenas hay dirección elegida */}
                {!addingAddress && addressId && (
                  <div className="mt-3">
                    {shippingPending && (
                      <p className="text-xs text-foreground-muted">Verificando cobertura de envío...</p>
                    )}
                    {shippingQuote && (
                      <p className="rounded-md border border-gold/30 bg-gold/5 px-3 py-2 text-sm text-gold-hover">
                        ✓ Llegamos a esta dirección — envío {formatCLP(shippingQuote.shippingCost)}
                        {shippingQuote.distanceKm != null ? ` (${shippingQuote.distanceKm.toFixed(1)} km)` : ""}
                      </p>
                    )}
                    {shippingError && (
                      <p className="rounded-md border border-burgundy/30 bg-burgundy/5 px-3 py-2 text-sm text-burgundy-hover">
                        ✗ No llegamos a esta dirección ({shippingError}). Probá con retiro en tienda u otra
                        dirección.
                      </p>
                    )}
                  </div>
                )}

                {addingAddress && (
                  <form action={addressAction} className="mt-2 space-y-2">
                    {addressState?.error && <p className="text-sm text-burgundy-hover">{addressState.error}</p>}
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        name="label"
                        placeholder="Nombre de la dirección (ej. Casa)"
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
                        className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
                      />
                      <input
                        name="numero"
                        placeholder="Número"
                        required
                        className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
                      />
                      {housingType === "departamento" && (
                        <input
                          name="depto_numero"
                          placeholder="N.º de departamento"
                          required
                          className="col-span-2 rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
                        />
                      )}

                      <RegionComunaFields />

                      <input
                        name="ciudad"
                        placeholder="Ciudad"
                        required
                        className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
                      />
                      <input
                        name="codigo_postal"
                        placeholder="Código postal (opcional)"
                        className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={addressPending}
                        className="rounded-md bg-gold px-4 py-1.5 text-sm font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
                      >
                        {addressPending ? "Ubicando..." : "Guardar dirección"}
                      </button>
                      {addresses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setAddingAddress(false)}
                          className="rounded-md border border-charcoal-border px-4 py-1.5 text-sm text-foreground-muted"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </section>
            )}

            {selectedStore?.min_order_amount != null && subtotal < selectedStore.min_order_amount && (
              <p className="text-sm text-burgundy-hover">
                El pedido mínimo para esta sucursal es {formatCLP(selectedStore.min_order_amount)}.
              </p>
            )}

            <button
              type="button"
              disabled={!canLeaveEntrega}
              onClick={() => setStep("programar")}
              className="w-full rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-ink shadow-card transition hover:bg-gold-hover disabled:opacity-50"
            >
              Continuar
            </button>
          </div>
        )}

        {/* Paso 2: programar */}
        {step === "programar" && (
          <div className="mt-6 space-y-6">
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">
                {deliveryMethod === "pickup" ? "Fecha y hora de retiro" : "Fecha y hora de despacho"}
              </h2>
              <p className="mt-1 text-xs text-foreground-muted">Opcional — si no elegís, lo preparamos apenas se confirme el pago.</p>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="mt-2 rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
              />
            </section>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep("entrega")}
                className="rounded-full border border-charcoal-border px-5 py-2.5 text-sm text-foreground-muted transition hover:border-gold-dark hover:text-gold"
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={() => setStep("pago")}
                className="flex-1 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-ink shadow-card transition hover:bg-gold-hover"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* Paso 3: pago */}
        {step === "pago" && (
          <div className="mt-6 space-y-6">
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">
                Forma de pago
              </h2>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 rounded-md border border-charcoal-border p-3 text-sm has-[:checked]:border-gold">
                  <input
                    type="radio"
                    name="payment_method_radio"
                    checked={paymentMethod === "mercadopago"}
                    onChange={() => setPaymentMethod("mercadopago")}
                  />
                  Mercado Pago (tarjeta, débito, etc.)
                </label>
                <label className="flex items-center gap-2 rounded-md border border-charcoal-border p-3 text-sm has-[:checked]:border-gold">
                  <input
                    type="radio"
                    name="payment_method_radio"
                    checked={paymentMethod === "bank_transfer"}
                    onChange={() => setPaymentMethod("bank_transfer")}
                  />
                  Transferencia bancaria (por WhatsApp)
                </label>
              </div>
              {paymentMethod === "bank_transfer" && (
                <p className="mt-2 text-xs text-foreground-muted">
                  Te vamos a redirigir a WhatsApp con el pedido y el monto — mandanos el comprobante ahí para
                  confirmar.
                </p>
              )}
            </section>

            <form action={checkoutAction}>
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
              <input type="hidden" name="payment_method" value={paymentMethod} />
              {checkoutState?.error && <p className="mb-2 text-sm text-burgundy-hover">{checkoutState.error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("programar")}
                  className="rounded-full border border-charcoal-border px-5 py-2.5 text-sm text-foreground-muted transition hover:border-gold-dark hover:text-gold"
                >
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={checkoutPending || !storeId || (deliveryMethod === "shipping" && !addressId)}
                  className="flex-1 rounded-full bg-gold px-5 py-3 text-sm font-semibold text-ink shadow-card transition hover:bg-gold-hover disabled:opacity-50"
                >
                  {checkoutPending
                    ? paymentMethod === "bank_transfer"
                      ? "Redirigiendo a WhatsApp..."
                      : "Redirigiendo a Mercado Pago..."
                    : paymentMethod === "bank_transfer"
                      ? "Continuar por WhatsApp"
                      : "Pagar con Mercado Pago"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Columna derecha: resumen, siempre visible */}
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-charcoal-border bg-background-elevated p-6 shadow-card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">Resumen</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-foreground-muted">
            {items.map((item) => {
              const lineTotal = cartItemUnitPrice(item) * item.quantity;
              const { neto } = splitIva(lineTotal);
              return (
                <li key={item.key} className="flex justify-between gap-4">
                  <span className="text-foreground">
                    {item.quantity}× {item.name}
                  </span>
                  <span className="shrink-0">{formatCLP(neto)} + IVA</span>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 space-y-1 border-t border-charcoal-border pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-foreground-muted">Neto</span>
              <span className="text-foreground">{formatCLP(splitIva(subtotal).neto)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-muted">IVA (19%)</span>
              <span className="text-foreground">{formatCLP(splitIva(subtotal).iva)}</span>
            </div>
            {/* El envío recién se muestra una vez que el paso de entrega lo
                calculó — antes de eso no se conoce, así que no se inventa un
                valor provisorio. */}
            {deliveryMethod === "shipping" && shippingKnown && (
              <div className="flex justify-between">
                <span className="text-foreground-muted">Envío</span>
                <span className="text-foreground">{formatCLP(shippingCost)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium">
              <span className="text-foreground">Subtotal</span>
              <span className="text-foreground">{formatCLP(subtotal + (shippingKnown ? shippingCost : 0))}</span>
            </div>
          </div>

          <div className="mt-4 space-y-3 border-t border-charcoal-border pt-3">
            <div>
              <label htmlFor="coupon" className="text-xs text-foreground-muted">
                Cupón de descuento
              </label>
              <input
                id="coupon"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Código (opcional)"
                className="mt-1 w-full rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm uppercase"
              />
            </div>
            {pointsBalance > 0 && (
              <div>
                <label className="text-xs text-foreground-muted">
                  Tenés {pointsBalance} puntos ({formatCLP(pointsBalance * pointsToClpRate)})
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
                  className="mt-1 w-full rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
                />
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-charcoal-border pt-4">
            <div className="flex justify-between text-lg font-semibold">
              <span className="text-foreground">Total</span>
              <span className="text-gold">{formatCLP(shippingKnown ? total : subtotal - estimatedPointsDiscount)}</span>
            </div>
            <p className="text-right text-xs text-foreground-muted/70">
              IVA incluido
              {deliveryMethod === "shipping" && !shippingKnown ? " · envío se calcula en el paso de entrega" : ""}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
