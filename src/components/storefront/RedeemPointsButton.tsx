"use client";

import { useActionState } from "react";
import { redeemProductForPoints, type RedeemProductState } from "@/lib/loyalty/actions";

export function RedeemPointsButton({
  productId,
  storeId,
  pointsCost,
  pointsBalance,
}: {
  productId: string;
  storeId: string;
  pointsCost: number;
  pointsBalance: number;
}) {
  const [state, formAction, pending] = useActionState<RedeemProductState, FormData>(
    (prev) => redeemProductForPoints(productId, storeId, prev),
    null,
  );

  const canRedeem = pointsBalance >= pointsCost;

  return (
    <form action={formAction} className="mt-2">
      {state?.error && <p className="mb-1 text-xs text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending || !canRedeem}
        className="rounded-md border border-gold-dark px-3 py-1.5 text-xs text-gold-hover hover:border-gold disabled:opacity-40"
      >
        {pending
          ? "Canjeando..."
          : canRedeem
            ? "Canjear con mis puntos (retiro en tienda)"
            : `Te faltan ${pointsCost - pointsBalance} puntos`}
      </button>
    </form>
  );
}
