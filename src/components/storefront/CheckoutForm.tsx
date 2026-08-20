"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
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
} from "lucide-react";
import { useCart } from "@/lib/cart/CartContext";
import { cartItemUnitPrice } from "@/lib/cart/types";
import { formatCLP, splitIva } from "@/lib/format";
import { RegionComunaFields } from "./RegionComunaFields";
import { type BusinessHours } from "@/lib/stores/schedule";
import {
  createCheckoutPreference,
  previewShipping,
  saveAddress,
  getScheduleOptions,
  previewCoupon,
  type CheckoutState,
  type ShippingPreviewState,
  type ScheduleDayOption,
  type ScheduleSlot,
  type CouponPreviewResult,
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
  business_hours: BusinessHours;
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

type StepStatus = "done" | "active" | "upcoming";

// Un día entero de slots sueltos de 15 min (hasta ~36 opciones) es difícil
// de escanear — se agrupan en Mañana/Tarde/Noche, igual que un combo de
// horarios de cualquier reserva online, para que la lista no se sienta
// interminable.
function groupSlotsByPeriod(slots: ScheduleSlot[]): { label: string; slots: ScheduleSlot[] }[] {
  const groups = [
    { label: "Mañana (antes de las 13:00)", from: 0, to: 13 * 60 },
    { label: "Tarde (13:00 a 18:00)", from: 13 * 60, to: 18 * 60 },
    { label: "Noche (después de las 18:00)", from: 18 * 60, to: 24 * 60 },
  ];
  return groups
    .map((g) => ({
      label: g.label,
      slots: slots.filter((s) => {
        const [h, m] = s.time.split(":").map(Number);
        const minutes = h * 60 + m;
        return minutes >= g.from && minutes < g.to;
      }),
    }))
    .filter((g) => g.slots.length > 0);
}

export function CheckoutForm({
  addresses,
  stores,
}: {
  addresses: Address[];
  stores: StoreOption[];
}) {
  const router = useRouter();
  const { items, hydrated, subtotal } = useCart();
  const [couponCode, setCouponCode] = useState("");
  const [couponPreview, setCouponPreview] = useState<CouponPreviewResult>(null);
  const [couponPreviewLoading, setCouponPreviewLoading] = useState(false);
  const [step, setStep] = useState<Step>("entrega");

  useEffect(() => {
    if (hydrated && items.length === 0) router.replace("/carrito");
  }, [hydrated, items.length, router]);

  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "shipping">("pickup");
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [addressId, setAddressId] = useState(addresses[0]?.id ?? "");
  const [addingAddress, setAddingAddress] = useState(addresses.length === 0);
  const [housingType, setHousingType] = useState<"casa" | "departamento">("casa");
  const [paymentMethod, setPaymentMethod] = useState<"mercadopago" | "bank_transfer">("mercadopago");

  // Días/horarios agendables — se piden al servidor (getScheduleOptions)
  // cada vez que cambia la sucursal o el método de entrega, porque el
  // horario de retiro y de despacho pueden ser distintos y el tope de
  // pedidos por slot depende de lo que ya haya reservado OTROS clientes
  // (nunca se calcula esto en el navegador, solo se muestra lo que
  // devuelve el servidor).
  const [scheduleDays, setScheduleDays] = useState<ScheduleDayOption[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [selectedDayIso, setSelectedDayIso] = useState("");
  const [selectedSlotIso, setSelectedSlotIso] = useState("");

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
    startTransition(() => shippingAction(fd));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, addressId, subtotal]);

  // Días/horarios agendables — se recargan cuando cambia la sucursal o el
  // método de entrega (cada uno puede tener su propio horario). La
  // selección anterior se descarta porque puede ya no ser válida (otro
  // horario, otro tope de pedidos).
  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScheduleLoading(true);
    setSelectedDayIso("");
    setSelectedSlotIso("");
    getScheduleOptions(storeId, deliveryMethod).then((days) => {
      if (cancelled) return;
      setScheduleDays(days);
      setSelectedDayIso(days[0]?.dateIso ?? "");
      setScheduleLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [storeId, deliveryMethod]);

  // Preview del cupón: se revalida con la misma lógica del cobro real cada
  // vez que el cliente termina de escribir el código (con debounce, para no
  // pegarle al servidor en cada tecla) — así el descuento se ve reflejado
  // en el Total antes de pagar, no recién después.
  useEffect(() => {
    if (!couponCode.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCouponPreview(null);
      setCouponPreviewLoading(false);
      return;
    }
    // `cancelled` evita que una respuesta vieja (de una tecla anterior, o
    // que tardó más que la siguiente) pise el resultado de la más reciente
    // — sin esto, tipear rápido puede dejar en pantalla el resultado de un
    // código que el cliente ya borró/cambió.
    let cancelled = false;
    setCouponPreviewLoading(true);
    const timeout = setTimeout(() => {
      previewCoupon(
        couponCode,
        subtotal,
        items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: cartItemUnitPrice(item),
        })),
      )
        .then((result) => {
          if (cancelled) return;
          setCouponPreview(result);
          setCouponPreviewLoading(false);
        })
        .catch(() => {
          // Si esto queda sin manejar, un solo error de red deja el estado
          // en "Verificando..." para siempre (el .then nunca corre) —
          // pasó de verdad, por eso el catch explícito.
          if (cancelled) return;
          setCouponPreview({ ok: false, error: "No pudimos validar el cupón. Probá de nuevo." });
          setCouponPreviewLoading(false);
        });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponCode, subtotal]);

  const selectedStore = stores.find((s) => s.id === storeId) ?? null;
  const selectedDay = scheduleDays.find((d) => d.dateIso === selectedDayIso) ?? null;
  const canLeavePrograma = !!selectedSlotIso;
  const shippingQuote = shippingState && "ok" in shippingState ? shippingState : null;
  const shippingError = shippingState && "error" in shippingState ? shippingState.error : null;
  const shippingCost = shippingQuote?.shippingCost ?? 0;
  const shippingKnown = deliveryMethod === "pickup" || !!shippingQuote;
  const totalBeforeDiscounts = subtotal + (deliveryMethod === "shipping" ? shippingCost : 0);
  const couponDiscount = couponPreview?.ok ? couponPreview.discountClp : 0;
  const total = Math.max(totalBeforeDiscounts - couponDiscount, 0);

  // Paso 1 (Entrega): solo hace falta la sucursal — la dirección todavía no
  // se pidió, así que acá no se puede validar cobertura/costo de despacho.
  const canLeaveEntrega = !!storeId;
  // Paso 2 (Dirección, solo si hay despacho): con la sucursal y el método de
  // entrega ya elegidos, acá sí se conoce si el despacho tiene cobertura.
  const canLeaveDireccion =
    !!addressId && !addingAddress && (deliveryMethod === "pickup" || (!!shippingQuote && !shippingError));

  // Estado de cada sección del acordeón: "done" (ya pasada, se muestra
  // colapsada con resumen), "active" (la que está resolviendo ahora mismo,
  // con el formulario completo) o "upcoming" (todavía no llegó).
  function statusFor(key: Step): StepStatus {
    const idx = visibleSteps.findIndex((s) => s.key === key);
    if (idx === -1 || idx > activeStepIndex) return "upcoming";
    return idx < activeStepIndex ? "done" : "active";
  }

  if (!hydrated || items.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
      {/* Columna izquierda: wizard paso a paso — solo el paso activo se
          renderiza (no todo el flujo apilado a la vez), así el cliente ve
          únicamente lo que le corresponde completar en cada momento. */}
      <div className="space-y-4">
        {/* Barra de progreso — círculos+conector en una fila y las
            etiquetas en otra debajo, alineadas por el mismo reparto
            flex-1/last:flex-initial, así se ven siempre (también en
            mobile) sin que el conector se rompa. */}
        <div className="rounded-2xl border border-crust-soft bg-masa p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            {visibleSteps.map((s, i) => {
              const stepStatus = statusFor(s.key);
              return (
                <div key={s.key} className="flex flex-1 items-center last:flex-initial">
                  <button
                    type="button"
                    disabled={stepStatus !== "done"}
                    onClick={() => stepStatus === "done" && setStep(s.key)}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                      stepStatus === "active"
                        ? "bg-gold text-ink"
                        : stepStatus === "done"
                          ? "cursor-pointer bg-gold/20 text-gold"
                          : "bg-crust-soft text-foreground-muted"
                    }`}
                  >
                    {stepStatus === "done" ? <Check className="h-4 w-4" /> : i + 1}
                  </button>
                  {i < visibleSteps.length - 1 && <div className="mx-2 h-px flex-1 bg-crust-soft sm:mx-4" />}
                </div>
              );
            })}
          </div>
          <div className="mt-1.5 flex items-start justify-between">
            {visibleSteps.map((s) => {
              const stepStatus = statusFor(s.key);
              return (
                <span
                  key={s.key}
                  className={`flex-1 text-center text-[9px] font-bold uppercase leading-tight tracking-wide last:flex-initial sm:text-[10px] sm:tracking-widest ${
                    stepStatus === "active" ? "text-foreground" : "text-foreground-muted"
                  }`}
                >
                  {s.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Tarjeta del paso activo */}
        <div className="rounded-2xl border border-crust-soft bg-masa p-6 shadow-card sm:p-8">
        {step === "entrega" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/10 text-xs font-bold text-gold">
                {visibleSteps.findIndex((s) => s.key === "entrega") + 1}
              </span>
              <h2 className="font-display text-lg text-foreground">Entrega</h2>
            </div>
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

        {step === "direccion" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/10 text-xs font-bold text-gold">
                {visibleSteps.findIndex((s) => s.key === "direccion") + 1}
              </span>
              <h2 className="font-display text-lg text-foreground">Dirección</h2>
            </div>
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

        {step === "programar" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/10 text-xs font-bold text-gold">
                {visibleSteps.findIndex((s) => s.key === "programar") + 1}
              </span>
              <h2 className="font-display text-lg text-foreground">Fecha y hora</h2>
            </div>
            <section>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-foreground-muted">
                <CalendarClock className="h-4 w-4 text-gold-dark" />
                {deliveryMethod === "pickup" ? "Fecha y hora de retiro" : "Fecha y hora de despacho"}
              </h2>
              <p className="mt-1 text-xs text-foreground-muted">
                Elegí cuándo {deliveryMethod === "pickup" ? "vas a retirar" : "querés recibir"} tu pedido — hasta 3
                días desde hoy, en bloques de 15 minutos.
              </p>

              {scheduleLoading && (
                <p className="mt-3 text-xs text-foreground-muted">Cargando horarios disponibles...</p>
              )}

              {!scheduleLoading && scheduleDays.length === 0 && (
                <p className="mt-3 text-xs text-burgundy-hover">
                  Esta sucursal no tiene horario de {deliveryMethod === "pickup" ? "retiro" : "despacho"}{" "}
                  configurado — no se puede agendar todavía.
                </p>
              )}

              {!scheduleLoading && scheduleDays.length > 0 && (
                <>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {scheduleDays.map((d) => (
                      <button
                        key={d.dateIso}
                        type="button"
                        onClick={() => {
                          setSelectedDayIso(d.dateIso);
                          setSelectedSlotIso("");
                        }}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition ${
                          selectedDayIso === d.dateIso
                            ? "border-gold bg-gold/10 text-gold"
                            : "border-charcoal-border text-foreground-muted hover:border-gold-dark/60"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>

                  {selectedDay && (
                    <div className="mt-3">
                      <label htmlFor="slot_select" className="mb-1 block text-xs text-foreground-muted">
                        Horario
                      </label>
                      <select
                        id="slot_select"
                        value={selectedSlotIso}
                        onChange={(e) => setSelectedSlotIso(e.target.value)}
                        className={inputClass}
                      >
                        <option value="" disabled>
                          Elegí un horario...
                        </option>
                        {groupSlotsByPeriod(selectedDay.slots).map((group) => (
                          <optgroup key={group.label} label={group.label}>
                            {group.slots.map((slot) => (
                              <option key={slot.iso} value={slot.iso} disabled={!slot.available}>
                                {slot.time}
                                {slot.reason === "full" ? " — completo" : ""}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      {selectedDay.slots.every((s) => !s.available) && (
                        <p className="mt-1.5 text-xs text-burgundy-hover">
                          No quedan horarios disponibles ese día — probá otro.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
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
                disabled={!canLeavePrograma}
                onClick={() => setStep("pago")}
                className="flex-1 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-ink shadow-card transition hover:bg-gold-hover disabled:opacity-50"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {step === "pago" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/10 text-xs font-bold text-gold">
                {visibleSteps.findIndex((s) => s.key === "pago") + 1}
              </span>
              <h2 className="font-display text-lg text-foreground">Pago</h2>
            </div>
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
              <input type="hidden" name="scheduled_at" value={selectedSlotIso} />
              <input type="hidden" name="coupon_code" value={couponCode} />
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
      </div>

      {/* Columna derecha: resumen, siempre visible */}
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-crust-soft bg-masa p-6 shadow-card">
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
              <span className="text-foreground">
                {formatCLP(subtotal + (deliveryMethod === "shipping" && shippingKnown ? shippingCost : 0))}
              </span>
            </div>
            {couponPreview?.ok && (
              <div className="flex justify-between text-gold-hover">
                <span>Descuento ({couponCode.trim().toUpperCase()})</span>
                <span>-{formatCLP(couponPreview.discountClp)}</span>
              </div>
            )}
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
              {couponPreviewLoading && (
                <p className="mt-1 text-xs text-foreground-muted">Verificando cupón...</p>
              )}
              {!couponPreviewLoading && couponPreview?.ok && (
                <p className="mt-1 text-xs text-gold-hover">
                  Cupón aplicado: -{formatCLP(couponPreview.discountClp)}
                </p>
              )}
              {!couponPreviewLoading && couponPreview && !couponPreview.ok && (
                <p className="mt-1 text-xs text-burgundy-hover">{couponPreview.error}</p>
              )}
            </div>
          </div>

          <div className="mt-4 border-t border-charcoal-border pt-4">
            <div className="flex justify-between text-lg font-semibold">
              <span className="text-foreground">Total</span>
              <span className="text-gold">
                {formatCLP(shippingKnown ? total : Math.max(subtotal - couponDiscount, 0))}
              </span>
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
