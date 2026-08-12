"use client";

import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { useCart } from "@/lib/cart/CartContext";
import { buildCartItemKey } from "@/lib/cart/types";
import { formatCLP } from "@/lib/format";
import { DepartmentIcon } from "@/components/storefront/DepartmentIcon";

export type ProductGridCardData = {
  id: string;
  name: string;
  slug: string;
  price: number;
  discountedPrice: number;
  clearancePct: number | undefined;
  isGlutenFree: boolean;
  isSpecialEvent: boolean;
  imagePath: string | null;
  // Un producto con grupos de opciones obligatorios (ej. relleno de una
  // torta) no se puede agregar "a ciegas" desde la grilla — necesita que el
  // cliente elija en la ficha, así que ahí no se ofrece el atajo.
  canQuickAdd: boolean;
};

export function ProductGridCard({ product, publicBaseUrl }: { product: ProductGridCardData; publicBaseUrl: string }) {
  const { items, addItem, setQuantity } = useCart();

  const cartKey = buildCartItemKey(product.id, []);
  const cartItem = items.find((i) => i.key === cartKey);
  const cartQty = cartItem?.quantity ?? 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      unitBasePrice: product.discountedPrice,
      imagePath: product.imagePath,
      options: [],
    });
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuantity(cartKey, cartQty + 1);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuantity(cartKey, cartQty - 1);
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-background-alt/60 p-3 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/25 hover:shadow-[0_12px_40px_rgba(212,175,55,0.08)]">
      {/* Overlay de navegación — cubre toda la tarjeta pero queda DEBAJO
          (z-0) del botón de agregar, para que el click en "+" no dispare
          también la navegación a la ficha del producto. */}
      <Link href={`/tienda/${product.slug}`} className="absolute inset-0 z-0" aria-label={product.name} />

      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-background">
        {product.imagePath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${publicBaseUrl}/${product.imagePath}`}
            alt={product.name}
            className="pointer-events-none h-full w-full object-cover opacity-90 transition-all duration-700 group-hover:scale-105 group-hover:opacity-100"
          />
        ) : (
          <div
            className="pointer-events-none flex h-full items-center justify-center text-gold-dark/35"
            style={{
              background:
                "radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--color-gold) 12%, transparent), transparent 70%)",
            }}
          >
            <DepartmentIcon name={product.name} className="h-10 w-10" />
          </div>
        )}

        <div className="pointer-events-none absolute left-2 top-2 z-10 flex flex-col gap-1">
          {product.clearancePct && (
            <span className="rounded-full bg-burgundy px-2 py-0.5 text-[10px] font-medium text-foreground shadow-card">
              -{product.clearancePct}%
            </span>
          )}
          {product.isSpecialEvent && (
            <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink shadow-card">
              Edición limitada
            </span>
          )}
        </div>

        {cartQty > 0 && (
          <div className="pointer-events-none absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-black/10 bg-gold text-[11px] font-black text-ink shadow-lg">
            {cartQty}
          </div>
        )}

        {product.canQuickAdd &&
          (cartQty > 0 ? (
            <div className="absolute bottom-2 right-2 z-10 flex h-9 items-center overflow-hidden rounded-lg border border-black/10 bg-gold text-ink shadow-xl">
              <button
                type="button"
                onClick={handleDecrement}
                aria-label="Quitar una unidad"
                className="flex h-full w-7 items-center justify-center transition hover:bg-black/10 active:scale-95"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[1.25rem] select-none px-1 text-center text-xs font-bold">{cartQty}</span>
              <button
                type="button"
                onClick={handleIncrement}
                aria-label="Agregar una unidad"
                className="flex h-full w-7 items-center justify-center transition hover:bg-black/10 active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              aria-label={`Agregar ${product.name} al carrito`}
              className="absolute bottom-2 right-2 z-10 flex h-9 w-9 items-center justify-center rounded-lg bg-gold text-ink opacity-100 shadow-xl transition-all duration-300 hover:bg-gold-hover active:scale-95 md:opacity-0 md:group-hover:opacity-100"
            >
              <Plus className="h-4.5 w-4.5" />
            </button>
          ))}
      </div>

      <div className="pointer-events-none relative z-0 p-2 pt-3">
        <p className="font-display text-[15px] font-medium leading-snug text-foreground transition-colors group-hover:text-gold">
          {product.name}
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          {product.clearancePct ? (
            <p className="font-display text-sm font-semibold text-gold">
              {formatCLP(product.discountedPrice)}{" "}
              <span className="text-xs font-normal text-foreground-muted/60 line-through">
                {formatCLP(product.price)}
              </span>
            </p>
          ) : (
            <p className="font-display text-sm font-semibold text-gold">{formatCLP(product.price)}</p>
          )}
          {product.isGlutenFree && (
            <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-foreground-muted">
              Sin gluten
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
