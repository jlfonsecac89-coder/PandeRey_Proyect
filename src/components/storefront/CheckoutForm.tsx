"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  Truck,
  MapPin,
  CalendarClock,
  CreditCard,
  Landmark,
  Check,
  ClipboardList,
  ShieldCheck,
  Tag,
  Gift,
} from "lucide-react";
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

type StoreOption = {
  id: string;
  name: string;
  contact_address: string | null;
  min_order_amount: number | null;
  free_shipping_min_amount: number | null;
};

type Step = "direccion" | "entrega" | "programar" | "pago";
const STEPS: { key: Step; label: string }[] = [
  { key: "entrega", label: "Entrega" },
  { key: "direccion", label: "Dirección" },
  { key: "programar", label: "Fecha y hora" },
  { key: "pago", label: "Pago" },
];

const inputClass =
  "w-full rounded-lg border border-charcoal-border bg-background px-3 py-2 text-sm outline-none transition focus:border-gold";

export function CheckoutForm({
  addresses,
  stores,
  pointsBalance,
  pointsToClpRate,
}: {
  addresses: Address[];
  stores: StoreOption[];
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

  // Retiro en tienda no necesita dirección — el paso "Dirección" solo existe
  // en el recorrido cuando el cliente elige despacho a domicilio.
  const visibleSteps = STEPS.filter((s) => s.key !== "direccion" || deliveryMethod === "shipping");
  const activeStepIndex = visibleSteps.findIndex((s) => s.key === step);

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

  // Chequeo automático de cobertura: la sucursal se elige en el paso
  // "Entrega" y la dirección en el paso "Dirección" — apenas están las dos,
  // se dispara solo (sin esperar a que el cliente confirme nada), así el
  // paso "Dirección" ya puede mostrar si el despacho tiene cobertura.
  useEffect(() => {
    if (!storeId || !addressId) return;
    const fd = new FormData();
    fd.set("store_id", storeId);
    fd.set("delivery_method", "shipping");
    fd.set("address_id", addressId);
    fd.set("subtotal", String(subtotal));
    shippingAction(fd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, addressId, subtotal]);

  const selectedStore = stores.find((s) => s.id === storeId) ?? null;
  const shippingQuote = shippingState && "ok" in shippingState ? shippingState : null;
  const shippingError = shippingState && "error" in shippingState ? shippingState.error : null;
  const shippingCost = shippingQuote?.shippingCost ?? 0;
  const shippingKnown = deliveryMethod === "pickup" || !!shippingQuote;
  const totalBeforeDiscounts = subtotal + (deliveryMethod === "shipping" ? shippingCost : 0);
  const estimatedPointsDiscount = Math.floor(pointsToRedeem * pointsToClpRate);
  const total = Math.max(totalBeforeDiscounts - estimatedPointsDiscount, 0);

  // Paso 1 (Entrega): solo hace falta la sucursal — la dirección todavía no
  // se pidió, así que acá no se puede validar cobertura/costo de despacho.
  const canLeaveEntrega = !!storeId;
  // Paso 2 (Dirección, solo si hay despacho): con la sucursal y el método de
  // entrega ya elegidos, acá sí se conoce si el despacho tiene cobertura.
  const canLeaveDireccion =
    !!addressId && !addingAddress && (deliveryMethod === "pickup" || (!!shippingQuote && !shippingError));

  if (!hydrated || items.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
      {/* Columna izquierda: proceso por etapas */}
      <div className="rounded-2xl border border-charcoal-border bg-background-elevated p-6 shadow-card sm:p-8">
        <ol className="flex items-center">
          {visibleSteps.map((s, i) => {
            const isActive = i === activeStepIndex;
            const isDone = i < activeStepIndex;
            const isLast = i === visibleSteps.length - 1;
            return (
              <li key={s.key} className={`flex items-center ${isLast ? "" : "flex-1"}`}>
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                      isActive
                        ? "border-gold bg-gold text-ink"
                        : isDone
                          ? "border-gold-dark bg-gold-dark/15 text-gold-dark"
                          : "border-charcoal-border text-foreground-muted"
                    }`}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span
                    className={`hidden text-xs sm:inline ${
                      isActive ? "font-semibold text-foreground" : isDone ? "text-gold-dark" : "text-foreground-muted"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {!isLast && (
                  <span className={`mx-3 h-px flex-1 ${isDone ? "bg-gold-dark" : "bg-charcoal-border"}`} />
                )}
              </li>
            );
          })}
        </ol>

        {/* Paso 1: tipo de entrega */}
        {step === "entrega" && (
          <div className="mt-6 space-y-6">
            <section>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-foreground-muted">
                <Store className="h-4 w-4 text-gold-dark" />
                Sucursal
              </h2>
              {stores.length === 0 && (
                <p className="mt-2 text-sm text-burgundy-hover">
                  No hay sucursales activas todavía — no se puede continuar con el checkout.
                </p>
              )}
              <div className="mt-2 space-y-2">
                {stores.map((store) => (
                  <label
                    key={store.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-sm transition ${
                      storeId === store.id
                        ? "border-gold bg-gold/5 ring-1 ring-gold"
                        : "border-charcoal-border hover:border-gold-dark/60"
                    }`}
                  >
                    <input
                      type="radio"
                      name="store_radio"
                      className="accent-gold"
                      checked={storeId === store.id}
                      onChange={() => setStoreId(store.id)}
                    />
                    <span>
                      <span className="block font-medium text-foreground">{store.name}</span>
                      {store.contact_address && (
                        <span className="block text-xs text-foreground-muted">{store.contact_address}</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">
                Método de entrega
              </h2>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(
                  [
                    {
                      value: "pickup" as const,
                      Icon: Store,
                      title: "Retiro en tienda",
                      desc: "Sin costo de envío.",
                    },
                    {
                      value: "shipping" as const,
                      Icon: Truck,
                      title: "Despacho a domicilio",
                      desc: "En el próximo paso pedimos tu dirección para calcular el envío.",
                    },
                  ]
                ).map(({ value, Icon, title, desc }) => {
                  const selected = deliveryMethod === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDeliveryMethod(value)}
                      className={`flex flex-col gap-3 rounded-lg border p-4 text-left transition ${
                        selected ? "border-gold bg-gold/5 ring-1 ring-gold" : "border-charcoal-border hover:border-gold-dark/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Icon className={`h-5 w-5 ${selected ? "text-gold" : "text-foreground-muted"}`} />
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            selected ? "border-gold bg-gold" : "border-charcoal-border"
                          }`}
                        >
                          {selected && <span className="h-1.5 w-1.5 rounded-full bg-ink" />}
                        </span>
                      </div>
                      <span>
                        <span className="block text-sm font-medium text-foreground">{title}</span>
                        <span className="mt-0.5 block text-xs text-foreground-muted">{desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {selectedStore?.min_order_amount != null && subtotal < selectedStore.min_order_amount && (
              <p className="text-sm text-burgundy-hover">
                El pedido mínimo para esta sucursal es {formatCLP(selectedStore.min_order_amount)}.
              </p>
            )}

            <button
              type="button"
              disabled={!canLeaveEntrega}
              onClick={() => setStep(deliveryMethod === "shipping" ? "direccion" : "programar")}
              className="w-full rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-ink shadow-card transition hover:bg-gold-hover disabled:opacity-50"
            >
              Continuar
            </button>
          </div>
        )}

        {/* Paso 2: dirección (solo despacho a domicilio) */}
        {step === "direccion" && (
          <div className="mt-6 space-y-6">
            <section>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-foreground-muted">
                <MapPin className="h-4 w-4 text-gold-dark" />
                Tu dirección
              </h2>
              <p className="mt-1 text-xs text-foreground-muted">
                La necesitamos para calcular el costo y la cobertura del despacho.
              </p>

              {!addingAddress && addresses.length > 0 && (
                <div className="mt-2 space-y-2">
                  {addresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`flex items-center gap-3 rounded-lg border p-3 text-sm transition ${
                        addressId === addr.id
                          ? "border-gold bg-gold/5 ring-1 ring-gold"
                          : "border-charcoal-border hover:border-gold-dark/60"
                      }`}
                    >
                      <input
                        type="radio"
                        name="address_radio"
                        className="accent-gold"
                        checked={addressId === addr.id}
                        onChange={() => setAddressId(addr.id)}
                      />
                      <MapPin className="h-4 w-4 shrink-0 text-gold-dark" />
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

              {addingAddress && (
                <form action={addressAction} className="mt-2 space-y-2">
                  {addressState?.error && <p className="text-sm text-burgundy-hover">{addressState.error}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      name="label"
                      placeholder="Nombre de la dirección (ej. Casa)"
                      className={`col-span-2 ${inputClass}`}
                    />

                    <div className="col-span-2 flex gap-3 text-sm">
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="housing_type"
                          value="casa"
                          className="accent-gold"
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
                          className="accent-gold"
                          checked={housingType === "departamento"}
                          onChange={() => setHousingType("departamento")}
                        />
                        Departamento
                      </label>
                    </div>

                    <input name="calle" placeholder="Calle" required className={inputClass} />
                    <input name="numero" placeholder="Número" required className={inputClass} />
                    {housingType === "departamento" && (
                      <input
                        name="depto_numero"
                        placeholder="N.º de departamento"
                        required
                        className={`col-span-2 ${inputClass}`}
                      />
                    )}

                    <RegionComunaFields />

                    <input name="ciudad" placeholder="Ciudad" required className={`col-span-2 ${inputClass}`} />
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

            <section>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-foreground-muted">
                <Truck className="h-4 w-4 text-gold-dark" />
                Cobertura de despacho
              </h2>
              <div className="mt-2 rounded-lg border border-charcoal-border p-3 text-sm">
                {shippingPending && (
                  <span className="block text-xs text-foreground-muted">Verificando cobertura...</span>
                )}
                {shippingQuote && (
                  <span className="block text-xs text-gold-hover">
                    Envío {formatCLP(shippingQuote.shippingCost)}
                    {shippingQuote.distanceKm != null ? ` · ${shippingQuote.distanceKm.toFixed(1)} km` : ""}
                  </span>
                )}
                {shippingError && (
                  <p className="text-xs text-burgundy-hover">
                    {shippingError}{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryMethod("pickup");
                        setStep("entrega");
                      }}
                      className="underline hover:text-burgundy"
                    >
                      Cambiar a retiro en tienda
                    </button>
                  </p>
                )}
              </div>
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
                disabled={!canLeaveDireccion}
                onClick={() => setStep("programar")}
                className="flex-1 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-ink shadow-card transition hover:bg-gold-hover disabled:opacity-50"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* Paso 3: programar */}
        {step === "programar" && (
          <div className="mt-6 space-y-6">
            <section>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-foreground-muted">
                <CalendarClock className="h-4 w-4 text-gold-dark" />
                {deliveryMethod === "pickup" ? "Fecha y hora de retiro" : "Fecha y hora de despacho"}
              </h2>
              <p className="mt-1 text-xs text-foreground-muted">
                Opcional — si no elegís, lo preparamos apenas se confirme el pago.
              </p>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className={`mt-2 max-w-xs ${inputClass}`}
              />
            </section>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(deliveryMethod === "shipping" ? "direccion" : "entrega")}
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

        {/* Paso 4: pago */}
        {step === "pago" && (
          <div className="mt-6 space-y-6">
            <section>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-foreground-muted">
                <CreditCard className="h-4 w-4 text-gold-dark" />
                Forma de pago
              </h2>
              <div className="mt-2 space-y-2">
                {(
                  [
                    {
                      value: "mercadopago" as const,
                      Icon: CreditCard,
                      title: "Mercado Pago",
                      desc: "Tarjeta de crédito, débito y otros medios.",
                    },
                    {
                      value: "bank_transfer" as const,
                      Icon: Landmark,
                      title: "Transferencia bancaria",
                      desc: "Coordinás el pago por WhatsApp con el pedido y el monto ya listos.",
                    },
                  ]
                ).map(({ value, Icon, title, desc }) => {
                  const selected = paymentMethod === value;
                  return (
                    <label
                      key={value}
                      className={`flex items-center gap-3 rounded-lg border p-3 text-sm transition ${
                        selected ? "border-gold bg-gold/5 ring-1 ring-gold" : "border-charcoal-border hover:border-gold-dark/60"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_method_radio"
                        className="accent-gold"
                        checked={selected}
                        onChange={() => setPaymentMethod(value)}
                      />
                      <Icon className={`h-5 w-5 shrink-0 ${selected ? "text-gold" : "text-foreground-muted"}`} />
                      <span>
                        <span className="block font-medium text-foreground">{title}</span>
                        <span className="block text-xs text-foreground-muted">{desc}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
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
          <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-foreground-muted">
            <ClipboardList className="h-4 w-4 text-gold-dark" />
            Resumen del pedido
          </h2>
          <ul className="mt-3 divide-y divide-charcoal-border/60 text-sm text-foreground-muted">
            {items.map((item) => {
              const lineTotal = cartItemUnitPrice(item) * item.quantity;
              const { neto } = splitIva(lineTotal);
              return (
                <li key={item.key} className="flex justify-between gap-4 py-1.5 first:pt-0 last:pb-0">
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
            {/* El envío recién se muestra una vez que el paso de dirección lo
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
              <label htmlFor="coupon" className="flex items-center gap-1.5 text-xs text-foreground-muted">
                <Tag className="h-3.5 w-3.5" />
                Cupón de descuento
              </label>
              <input
                id="coupon"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Código (opcional)"
                className={`mt-1 uppercase ${inputClass}`}
              />
            </div>
            {pointsBalance > 0 && (
              <div>
                <label className="flex items-center gap-1.5 text-xs text-foreground-muted">
                  <Gift className="h-3.5 w-3.5" />
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
                  className={`mt-1 ${inputClass}`}
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
              {deliveryMethod === "shipping" && !shippingKnown ? " · envío se calcula en el paso de dirección" : ""}
            </p>
          </div>
        </div>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-foreground-muted/70">
          <ShieldCheck className="h-3.5 w-3.5 text-gold-dark" />
          {step === "pago" && paymentMethod === "bank_transfer"
            ? "Coordinás el pago directo con la tienda por WhatsApp"
            : "Pago procesado de forma segura por Mercado Pago"}
        </p>
      </aside>
    </div>
  );
}
