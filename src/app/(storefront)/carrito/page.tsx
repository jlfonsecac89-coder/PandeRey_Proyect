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
      <div className="mx-auto max-w-2xl px-6 py-10 text-center">
        <h1 className="text-xl font-semibold text-gold">Tu carrito está vacío</h1>
        <Link href="/tienda" className="mt-4 inline-block text-sm text-gold-hover underline">
          Ir a la tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-xl font-semibold text-gold">Tu carrito</h1>

      <ul className="mt-6 space-y-4">
        {items.map((item) => (
          <li
            key={item.key}
            className="flex items-center justify-between gap-4 rounded-lg border border-charcoal-border bg-charcoal-light p-4"
          >
            <div className="flex-1">
              <p className="text-sm text-foreground/90">{item.name}</p>
              {item.options.length > 0 && (
                <p className="text-xs text-foreground/50">
                  {item.options.map((o) => o.optionValueName).join(", ")}
                </p>
              )}
              <p className="mt-1 text-sm text-gold">{formatCLP(cartItemUnitPrice(item))}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => setQuantity(item.key, Math.max(1, Number(e.target.value) || 1))}
                className="w-16 rounded-md border border-charcoal-border bg-background px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => removeItem(item.key)}
                className="text-xs text-red-400 hover:underline"
              >
                Quitar
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between border-t border-charcoal-border pt-4">
        <p className="text-sm text-foreground/70">Subtotal</p>
        <p className="text-lg font-semibold text-gold">{formatCLP(subtotal)}</p>
      </div>

      <Link
        href="/checkout"
        className="mt-6 block w-full rounded-md bg-gold px-5 py-2.5 text-center text-sm font-semibold text-background hover:bg-gold-hover"
      >
        Continuar al pago
      </Link>
    </div>
  );
}
