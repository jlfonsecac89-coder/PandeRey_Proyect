"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart/CartContext";
import type { CartOptionSelection } from "@/lib/cart/types";
import { formatCLP } from "@/lib/format";

type OptionValue = { id: string; name: string; price_delta: number };
type OptionGroup = {
  id: string;
  name: string;
  selection_type: "single" | "multiple";
  is_required: boolean;
  values: OptionValue[];
};

export function AddToCartForm({
  product,
  optionGroups,
}: {
  product: { id: string; name: string; slug: string; price: number; imagePath: string | null };
  optionGroups: OptionGroup[];
}) {
  const { addItem } = useCart();
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const toggleValue = (group: OptionGroup, valueId: string) => {
    setAdded(false);
    setSelected((prev) => {
      const current = prev[group.id] ?? [];
      if (group.selection_type === "single") {
        return { ...prev, [group.id]: [valueId] };
      }
      const next = current.includes(valueId)
        ? current.filter((v) => v !== valueId)
        : [...current, valueId];
      return { ...prev, [group.id]: next };
    });
  };

  const missingRequired = optionGroups.some((g) => g.is_required && !(selected[g.id]?.length));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (missingRequired) return;

    const options: CartOptionSelection[] = optionGroups.flatMap((g) =>
      (selected[g.id] ?? []).map((valueId) => {
        const value = g.values.find((v) => v.id === valueId)!;
        return {
          optionGroupId: g.id,
          optionGroupName: g.name,
          optionValueId: value.id,
          optionValueName: value.name,
          priceDelta: value.price_delta,
        };
      }),
    );

    addItem(
      {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        unitBasePrice: product.price,
        imagePath: product.imagePath,
        options,
      },
      quantity,
    );
    setAdded(true);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {optionGroups.map((group) => (
        <fieldset key={group.id}>
          <legend className="text-sm font-medium text-foreground/80">
            {group.name} {group.is_required && <span className="text-gold-dark">*</span>}
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {group.values.map((value) => {
              const isSelected = (selected[group.id] ?? []).includes(value.id);
              return (
                <button
                  type="button"
                  key={value.id}
                  onClick={() => toggleValue(group, value.id)}
                  className={`rounded-md border px-3 py-1.5 text-sm ${
                    isSelected
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-charcoal-border text-foreground/70 hover:border-gold-dark"
                  }`}
                >
                  {value.name}
                  {value.price_delta ? ` (+${formatCLP(value.price_delta)})` : ""}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="flex items-center gap-3">
        <label className="text-sm text-foreground/70" htmlFor="quantity">
          Cantidad
        </label>
        <input
          id="quantity"
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
          className="w-20 rounded-md border border-charcoal-border bg-charcoal-light px-2 py-1 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={missingRequired}
        className="rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-ink shadow-card transition hover:bg-gold-hover disabled:opacity-50"
      >
        Agregar al carrito
      </button>

      {added && (
        <p className="text-sm text-gold">
          Agregado al carrito.{" "}
          <button type="button" onClick={() => router.push("/carrito")} className="underline">
            Ver carrito
          </button>
        </p>
      )}
    </form>
  );
}
