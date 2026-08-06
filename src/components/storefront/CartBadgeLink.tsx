"use client";

import { useCart } from "@/lib/cart/CartContext";

export function CartBadgeLink() {
  const { itemCount, openCart } = useCart();

  return (
    <button
      type="button"
      onClick={openCart}
      aria-label="Abrir carrito de compra"
      className="relative rounded-md p-2 text-foreground-muted hover:bg-gold/10 hover:text-gold"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
        <path d="M3 4h2l.4 2M6.4 6H21l-2 9H8L6.4 6Z" />
        <circle cx="9.5" cy="19.5" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="17.5" cy="19.5" r="1.3" fill="currentColor" stroke="none" />
      </svg>
      {itemCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-ink">
          {itemCount}
        </span>
      )}
    </button>
  );
}
