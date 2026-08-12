"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
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
        className="flex h-10 items-center justify-center gap-2 rounded-xl border border-gold bg-gold px-4 text-[11px] font-bold uppercase tracking-widest text-ink shadow-lg shadow-gold/10 transition-all duration-200 hover:bg-gold-hover active:scale-95 disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
        {isPending ? "Agregando..." : "Repetir pedido"}
      </button>
      {unavailable && (
        <div className="mt-2 text-xs text-foreground-muted">
          <p className="text-burgundy-hover">Ya no están disponibles: {unavailable.join(", ")}.</p>
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
