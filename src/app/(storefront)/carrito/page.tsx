"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart/CartContext";
import { cartItemUnitPrice } from "@/lib/cart/types";
import { formatCLP } from "@/lib/format";

export default function CarritoPage() {
  const { items, hydrated, setQuantity, removeItem, subtotal } = useCart();

  if (!hydrated) return null;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="font-display text-2xl font-medium text-foreground">Tu carrito está vacío</h1>
        <p className="mt-2 text-sm text-foreground-muted">Todavía no agregaste nada — vamos a arreglar eso.</p>
        <Link
          href="/tienda"
          className="mt-6 inline-block rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-ink shadow-card hover:bg-gold-hover"
        >
          Ir a la tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">Paso 1 de 2</p>
      <h1 className="mt-1 font-display text-3xl font-medium text-foreground">Tu carrito</h1>

      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li
            key={item.key}
            className="flex items-center justify-between gap-4 rounded-xl border border-charcoal-border bg-background-elevated p-4 shadow-card"
          >
            <div className="flex-1">
              <p className="text-sm text-foreground">{item.name}</p>
              {item.options.length > 0 && (
                <p className="text-xs text-foreground-muted">
                  {item.options.map((o) => o.optionValueName).join(", ")}
                </p>
              )}
              <p className="mt-1 text-sm font-medium text-gold">{formatCLP(cartItemUnitPrice(item))}</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => setQuantity(item.key, Math.max(1, Number(e.target.value) || 1))}
                className="w-16 rounded-md border border-charcoal-border bg-background px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => removeItem(item.key)}
                className="text-xs text-foreground-muted transition hover:text-burgundy-hover"
              >
                Quitar
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between border-t border-charcoal-border pt-5">
        <p className="text-sm text-foreground-muted">Subtotal</p>
        <p className="text-lg font-semibold text-gold">{formatCLP(subtotal)}</p>
      </div>

      <Link
        href="/checkout"
        className="mt-6 block w-full rounded-full bg-gold px-5 py-3 text-center text-sm font-semibold text-ink shadow-card transition hover:bg-gold-hover"
      >
        Continuar al pago
      </Link>
    </div>
  );
}
