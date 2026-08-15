"use client";

import { useActionState } from "react";
import { addStockBatch, setBatchClearance, type CatalogActionState } from "@/lib/catalog/actions";
import { FormMessage } from "@/components/auth/AuthCard";

type Store = { id: string; name: string };
type Batch = {
  id: string;
  quantity: number;
  expiration_date: string | null;
  is_clearance: boolean;
  clearance_discount_percent: number | null;
  store: { name: string } | { name: string }[];
};

function isExpiringSoon(expirationDate: string | null, alertDays: number): boolean {
  if (!expirationDate) return false;
  const daysLeft = (new Date(expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return daysLeft <= alertDays;
}

function BatchClearanceForm({ batch, productId }: { batch: Batch; productId: string }) {
  const boundAction = setBatchClearance.bind(null, batch.id, productId) as (
    state: CatalogActionState,
    formData: FormData,
  ) => Promise<CatalogActionState>;
  const [state, formAction, pending] = useActionState(boundAction, null);

  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/5 pt-2">
      <label className="flex items-center gap-1.5 text-xs text-foreground/70">
        <input type="checkbox" name="is_clearance" defaultChecked={batch.is_clearance} className="accent-gold" />
        Liquidación
      </label>
      <input
        type="number"
        name="clearance_discount_percent"
        min="1"
        max="90"
        placeholder="% desc."
        defaultValue={batch.clearance_discount_percent ?? ""}
        className="w-20 rounded-md border border-charcoal-border bg-background px-2 py-1 text-xs outline-none focus:border-gold"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-charcoal-border px-2.5 py-1 text-xs text-foreground/70 hover:border-gold-dark hover:text-gold disabled:opacity-50"
      >
        {pending ? "..." : "Guardar"}
      </button>
      {state?.error && <span className="text-xs text-red-400">{state.error}</span>}
    </form>
  );
}

export function StockSection({
  productId,
  stores,
  batches,
  clearanceAlertDays,
}: {
  productId: string;
  stores: Store[];
  batches: Batch[];
  clearanceAlertDays: number;
}) {
  const [state, formAction, pending] = useActionState(addStockBatch, null);

  return (
    <div>
      <p className="text-xs text-foreground/40">
        El stock disponible se calcula solo, sumando los lotes activos. El consumo al vender sigue FIFO (primero
        el lote más próximo a vencer).
      </p>

      {stores.length === 0 ? (
        <p className="mt-3 text-sm text-foreground/50">
          Todavía no hay sucursales creadas — no se puede cargar stock hasta que exista al menos una.
        </p>
      ) : (
        <>
          <div className="mt-3 space-y-2">
            {batches.map((b) => {
              const store = Array.isArray(b.store) ? b.store[0] : b.store;
              const expiring = isExpiringSoon(b.expiration_date, clearanceAlertDays);
              return (
                <div key={b.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-foreground">{store?.name}</p>
                    <p className="text-sm font-medium text-gold">{b.quantity} un.</p>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-foreground/50">
                    <span>
                      Vence: {b.expiration_date ? new Date(b.expiration_date).toLocaleDateString("es-CL") : "—"}
                    </span>
                    {expiring && !b.is_clearance && (
                      <span className="rounded-full border border-amber-500/60 px-1.5 py-0.5 text-[10px] text-amber-400">
                        Candidato a liquidación
                      </span>
                    )}
                  </div>
                  <BatchClearanceForm batch={b} productId={productId} />
                </div>
              );
            })}
            {batches.length === 0 && <p className="text-sm text-foreground/40">Sin lotes cargados.</p>}
          </div>

          <FormMessage error={state?.error} success={state?.success} />
          <form action={formAction} className="mt-4 space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <input type="hidden" name="product_id" value={productId} />
            <p className="text-xs font-medium uppercase tracking-wide text-foreground/40">Cargar lote nuevo</p>
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label htmlFor="store_id" className="mb-1 block text-xs text-foreground/60">
                  Sucursal
                </label>
                <select
                  id="store_id"
                  name="store_id"
                  required
                  defaultValue=""
                  className="rounded-md border border-charcoal-border bg-background px-2 py-1.5 text-sm outline-none focus:border-gold"
                >
                  <option value="" disabled>
                    Elegir...
                  </option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="quantity" className="mb-1 block text-xs text-foreground/60">
                  Cantidad
                </label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="0"
                  required
                  className="w-24 rounded-md border border-charcoal-border bg-background px-2 py-1.5 text-sm outline-none focus:border-gold"
                />
              </div>
              <div>
                <label htmlFor="expiration_date" className="mb-1 block text-xs text-foreground/60">
                  Vencimiento (opcional)
                </label>
                <input
                  id="expiration_date"
                  name="expiration_date"
                  type="date"
                  className="rounded-md border border-charcoal-border bg-background px-2 py-1.5 text-sm outline-none focus:border-gold"
                />
              </div>
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-gold px-3 py-1.5 text-sm font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
              >
                {pending ? "Cargando..." : "Cargar lote"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
