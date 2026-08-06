"use client";

import { useActionState } from "react";
import { createOptionGroup, createOptionValue } from "@/lib/catalog/actions";
import { FormMessage } from "@/components/auth/AuthCard";

type OptionValue = { id: string; name: string; price_delta: number };
type OptionGroup = { id: string; name: string; selection_type: string; values: OptionValue[] };

function ValorForm({ productId, groupId }: { productId: string; groupId: string }) {
  const [state, formAction, pending] = useActionState(createOptionValue, null);
  return (
    <form action={formAction} className="mt-2 flex items-end gap-2">
      <input type="hidden" name="option_group_id" value={groupId} />
      <input type="hidden" name="product_id" value={productId} />
      <input
        name="name"
        placeholder="Manjar"
        required
        className="rounded-md border border-charcoal-border bg-background px-2 py-1 text-xs outline-none focus:border-gold"
      />
      <input
        name="price_delta"
        type="number"
        step="1"
        placeholder="Recargo $"
        className="w-24 rounded-md border border-charcoal-border bg-background px-2 py-1 text-xs outline-none focus:border-gold"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-charcoal-border px-2 py-1 text-xs hover:bg-gold hover:text-ink"
      >
        + valor
      </button>
      {state?.error && <span className="text-xs text-red-400">{state.error}</span>}
    </form>
  );
}

export function VariantesSection({
  productId,
  groups,
}: {
  productId: string;
  groups: OptionGroup[];
}) {
  const [state, formAction, pending] = useActionState(createOptionGroup, null);

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
        Variantes (relleno, cobertura, tamaño...)
      </h2>
      <FormMessage error={state?.error} success={state?.success} />
      <div className="mt-2 space-y-4">
        {groups.map((g) => (
          <div key={g.id} className="rounded-md border border-charcoal-border p-3">
            <p className="text-sm text-foreground/80">
              {g.name}{" "}
              <span className="text-xs text-foreground/40">({g.selection_type})</span>
            </p>
            <ul className="mt-1 flex flex-wrap gap-2 text-xs text-foreground/60">
              {g.values.map((v) => (
                <li key={v.id} className="rounded-full border border-charcoal-border px-2 py-0.5">
                  {v.name}
                  {v.price_delta ? ` (+$${v.price_delta})` : ""}
                </li>
              ))}
            </ul>
            <ValorForm productId={productId} groupId={g.id} />
          </div>
        ))}
      </div>
      <form action={formAction} className="mt-3 flex items-end gap-2">
        <input type="hidden" name="product_id" value={productId} />
        <input
          name="name"
          placeholder="Relleno"
          required
          className="rounded-md border border-charcoal-border bg-background px-2 py-1.5 text-sm outline-none focus:border-gold"
        />
        <select
          name="selection_type"
          defaultValue="single"
          className="rounded-md border border-charcoal-border bg-background px-2 py-1.5 text-sm outline-none focus:border-gold"
        >
          <option value="single">Única selección</option>
          <option value="multiple">Selección múltiple</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-charcoal-border px-3 py-1.5 text-sm hover:bg-gold hover:text-ink"
        >
          + grupo
        </button>
      </form>
    </section>
  );
}
