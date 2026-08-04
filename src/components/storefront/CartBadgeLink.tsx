"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart/CartContext";

export function CartBadgeLink() {
  const { itemCount } = useCart();

  return (
    <Link
      href="/carrito"
      className="relative rounded-md px-3 py-1.5 text-sm text-foreground/60 hover:bg-charcoal-border hover:text-gold"
    >
      Carrito
      {itemCount > 0 && (
        <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-xs font-semibold text-background">
          {itemCount}
        </span>
      )}
    </Link>
  );
}
