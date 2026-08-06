"use client";

import { useActionState, useState } from "react";
import { submitReview } from "@/lib/reviews/actions";
import { FormMessage } from "@/components/auth/AuthCard";

export function ReviewForm({
  orderItemId,
  productId,
  orderId,
  productName,
}: {
  orderItemId: string;
  productId: string;
  orderId: string;
  productName: string;
}) {
  const [state, formAction, pending] = useActionState(submitReview, null);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);

  if (state?.success) {
    return <p className="text-xs text-gold-hover">{state.success}</p>;
  }

  return (
    <form action={formAction} className="mt-2 rounded-md border border-charcoal-border bg-background p-3">
      <input type="hidden" name="order_item_id" value={orderItemId} />
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="rating" value={rating} />

      <p className="text-xs text-foreground/60">Reseñar &quot;{productName}&quot;</p>
      <div className="mt-1 flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className={`text-lg ${star <= (hovered || rating) ? "text-gold" : "text-charcoal-border"}`}
            aria-label={`${star} estrellas`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        name="comment"
        placeholder="Contanos qué te pareció (opcional)"
        rows={2}
        className="mt-2 w-full rounded-md border border-charcoal-border bg-charcoal-light px-2 py-1.5 text-sm outline-none focus:border-gold"
      />
      <FormMessage error={state?.error} />
      <button
        type="submit"
        disabled={pending || rating === 0}
        className="mt-2 rounded-md bg-gold px-3 py-1.5 text-xs font-medium text-background hover:bg-gold-hover disabled:opacity-50"
      >
        {pending ? "Enviando..." : "Enviar reseña"}
      </button>
    </form>
  );
}
