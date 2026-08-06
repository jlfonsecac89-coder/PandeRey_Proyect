"use client";

import { useTransition } from "react";
import { moderateReview } from "@/lib/reviews/actions";

export function ModerateButtons({ reviewId }: { reviewId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => moderateReview(reviewId, true))}
        className="rounded-md border border-gold-dark px-2 py-1 text-xs text-gold-hover hover:bg-gold-dark/10 disabled:opacity-50"
      >
        Aprobar
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => moderateReview(reviewId, false))}
        className="rounded-md border border-charcoal-border px-2 py-1 text-xs text-foreground/60 hover:border-red-500/60 hover:text-red-400 disabled:opacity-50"
      >
        Rechazar
      </button>
    </div>
  );
}
