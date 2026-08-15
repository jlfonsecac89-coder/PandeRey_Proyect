"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/lib/cart/CartContext";
import { cartItemUnitPrice } from "@/lib/cart/types";
import { formatCLP } from "@/lib/format";

const publicProductBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images`;

export function CartDrawer() {
  const { items, hydrated, setQuantity, removeItem, clear, subtotal, isOpen, closeCart } = useCart();

  // Cerrar con Escape y bloquear el scroll del body mientras el panel está
  // abierto — patrón estándar de drawer, sin librería extra.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, closeCart]);

  if (!hydrated) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeCart}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-label="Carrito de compra"
        aria-hidden={!isOpen}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-white/10 bg-background/95 shadow-2xl backdrop-blur-xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <p className="font-display text-lg font-medium text-foreground">Tu carrito</p>
          <div className="flex items-center gap-3">
            {items.length > 0 && (
              <button type="button" onClick={clear} className="text-xs text-foreground-muted hover:text-burgundy-hover">
                Vaciar carrito
              </button>
            )}
            <button
              type="button"
              onClick={closeCart}
              aria-label="Cerrar carrito"
              className="rounded-full p-1.5 text-foreground-muted hover:bg-gold/10 hover:text-gold"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-foreground-muted">Tu carrito está vacío.</p>
            <Link
              href="/tienda"
              onClick={closeCart}
              className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink shadow-card hover:bg-gold-hover"
            >
              Ir a la tienda
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {items.map((item) => (
                <li key={item.key} className="flex gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-background-alt">
                    {item.imagePath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${publicProductBaseUrl}/${item.imagePath}`}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gold-dark/40">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
                          <path d="M4 13c0-4.5 3.5-8 8-8s8 3.5 8 8-3 6-8 6-8-1.5-8-6Z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    {item.options.length > 0 && (
                      <p className="text-xs text-foreground-muted">
                        {item.options.map((o) => o.optionValueName).join(", ")}
                      </p>
                    )}
                    {item.customizationNote && (
                      <p className="text-xs italic text-foreground-muted/80">{item.customizationNote}</p>
                    )}
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setQuantity(item.key, item.quantity - 1)}
                          aria-label="Restar unidad"
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-white/15 text-foreground-muted hover:border-gold-dark hover:text-gold"
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-sm text-foreground">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(item.key, item.quantity + 1)}
                          aria-label="Sumar unidad"
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-white/15 text-foreground-muted hover:border-gold-dark hover:text-gold"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-gold">
                        {formatCLP(cartItemUnitPrice(item) * item.quantity)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.key)}
                    aria-label="Quitar del carrito"
                    className="self-start text-foreground-muted/60 hover:text-burgundy-hover"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>

            <div className="border-t border-white/10 px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-muted">Subtotal</span>
                <span className="text-lg font-semibold text-gold">{formatCLP(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-foreground-muted/70">Envío e IVA se calculan en el checkout.</p>
              <Link
                href="/checkout"
                onClick={closeCart}
                className="mt-4 block w-full rounded-full bg-gold px-5 py-2.5 text-center text-sm font-semibold text-ink shadow-card transition hover:bg-gold-hover"
              >
                Finalizar compra
              </Link>
              <Link
                href="/carrito"
                onClick={closeCart}
                className="mt-2 block text-center text-xs text-gold-hover hover:underline"
              >
                Ver carrito completo
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
