"use client";

import { useActionState } from "react";
import { updateProductPointsCost } from "@/lib/catalog/actions";

export function PointsCostRow({
  productId,
  name,
  sku,
  pointsCost,
}: {
  productId: string;
  name: string;
  sku: string;
  pointsCost: number | null;
}) {
  const [state, formAction, pending] = useActionState(updateProductPointsCost, null);

  return (
    <tr className="border-b border-charcoal-border/50">
      <td className="py-2 font-mono text-xs text-gold-dark">{sku}</td>
      <td className="py-2">{name}</td>
      <td className="py-2">
        <form action={formAction} className="flex items-center gap-2">
          <input type="hidden" name="product_id" value={productId} />
          <input
            name="points_cost"
            type="number"
            min="0"
            defaultValue={pointsCost ?? ""}
            placeholder="No canjeable"
            className="w-32 rounded-md border border-charcoal-border bg-background px-2 py-1 text-sm outline-none focus:border-gold"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-charcoal-border px-2 py-1 text-xs hover:bg-gold hover:text-background disabled:opacity-50"
          >
            {pending ? "..." : "Guardar"}
          </button>
          {state?.error && <span className="text-xs text-red-400">{state.error}</span>}
        </form>
      </td>
    </tr>
  );
}
