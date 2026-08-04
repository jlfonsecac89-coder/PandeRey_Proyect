"use client";

import { useActionState } from "react";
import { addStockBatch } from "@/lib/catalog/actions";
import { FormMessage } from "@/components/auth/AuthCard";

type Store = { id: string; name: string };
type Batch = {
  id: string;
  quantity: number;
  expiration_date: string | null;
  is_clearance: boolean;
  store: { name: string } | { name: string }[];
};

export function StockSection({
  productId,
  stores,
  batches,
}: {
  productId: string;
  stores: Store[];
  batches: Batch[];
}) {
  const [state, formAction, pending] = useActionState(addStockBatch, null);

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
        Stock (lotes)
      </h2>
      <p className="mt-1 text-xs text-foreground/40">
        El stock disponible se calcula solo, sumando los lotes activos. El
        consumo al vender sigue FIFO (primero el lote más próximo a vencer).
      </p>

      {stores.length === 0 ? (
        <p className="mt-3 text-sm text-foreground/50">
          Todavía no hay sucursales creadas — no se puede cargar stock hasta
          que exista al menos una.
        </p>
      ) : (
        <>
          <table className="mt-3 w-full max-w-xl text-sm">
            <thead>
              <tr className="border-b border-charcoal-border text-left text-foreground/50">
                <th className="py-1.5 font-normal">Sucursal</th>
                <th className="py-1.5 font-normal">Cantidad</th>
                <th className="py-1.5 font-normal">Vence</th>
                <th className="py-1.5 font-normal">Liquidación</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => {
                const store = Array.isArray(b.store) ? b.store[0] : b.store;
                return (
                  <tr key={b.id} className="border-b border-charcoal-border/50">
                    <td className="py-1.5">{store?.name}</td>
                    <td className="py-1.5">{b.quantity}</td>
                    <td className="py-1.5 text-foreground/60">
                      {b.expiration_date
                        ? new Date(b.expiration_date).toLocaleDateString("es-CL")
                        : "—"}
                    </td>
                    <td className="py-1.5 text-foreground/60">
                      {b.is_clearance ? "Sí" : "No"}
                    </td>
                  </tr>
                );
              })}
              {batches.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-3 text-foreground/40">
                    Sin lotes cargados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <FormMessage error={state?.error} success={state?.success} />
          <form action={formAction} className="mt-2 flex flex-wrap items-end gap-2">
            <input type="hidden" name="product_id" value={productId} />
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
              className="rounded-md bg-gold px-3 py-1.5 text-sm font-medium text-background hover:bg-gold-hover disabled:opacity-50"
            >
              {pending ? "Cargando..." : "Cargar lote"}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
