"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart/CartContext";
import { getReorderItems } from "@/lib/orders/actions";

export function ReorderButton({ orderId }: { orderId: string }) {
  const { addItem } = useCart();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [unavailable, setUnavailable] = useState<string[] | null>(null);
  const [addedCount, setAddedCount] = useState(0);

  const handleClick = () => {
    startTransition(async () => {
      const result = await getReorderItems(orderId);
      for (const item of result.available) {
        addItem(
          {
            productId: item.productId,
            name: item.name,
            slug: item.slug,
            unitBasePrice: item.price,
            imagePath: item.imagePath,
            options: [],
          },
          item.quantity,
        );
      }
      setAddedCount(result.available.length);
      if (result.unavailable.length > 0) {
        setUnavailable(result.unavailable);
      } else if (result.available.length > 0) {
        router.push("/carrito");
      }
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md border border-gold-dark px-3 py-1.5 text-xs text-gold-hover hover:border-gold disabled:opacity-50"
      >
        {isPending ? "Agregando..." : "Repetir pedido"}
      </button>
      {unavailable && (
        <div className="mt-2 text-xs text-foreground/60">
          <p className="text-red-400">Ya no están disponibles: {unavailable.join(", ")}.</p>
          {addedCount > 0 && (
            <button type="button" onClick={() => router.push("/carrito")} className="mt-1 underline">
              Ver el resto en el carrito
            </button>
          )}
        </div>
      )}
    </div>
  );
}
