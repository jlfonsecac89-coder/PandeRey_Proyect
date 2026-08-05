"use client";

import { useActionState, useState } from "react";
import { createPromotion, type PromotionActionState } from "@/lib/promotions/actions";
import { FormMessage } from "@/components/auth/AuthCard";

type Option = { id: string; name: string };

export function PromocionForm({
  departments,
  categories,
  products,
}: {
  departments: Option[];
  categories: Option[];
  products: Option[];
}) {
  const [state, formAction, pending] = useActionState<PromotionActionState, FormData>(
    createPromotion,
    null,
  );
  const [type, setType] = useState("percentage");

  return (
    <div className="max-w-xl rounded-lg border border-charcoal-border bg-charcoal-light p-4">
      <h2 className="text-sm font-semibold text-gold">Nueva promoción</h2>
      <FormMessage error={state?.error} success={state?.success} />
      <form action={formAction} className="mt-2 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input
            name="name"
            placeholder="Nombre"
            required
            className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
          />
          <input
            name="code"
            placeholder="Código (vacío = automática)"
            className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm uppercase"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="percentage">Porcentaje (%)</option>
            <option value="fixed_amount">Monto fijo (CLP)</option>
          </select>
          <input
            name="value"
            type="number"
            step="0.01"
            placeholder={type === "percentage" ? "Ej. 15" : "Ej. 2000"}
            required
            className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
          />
        </div>

        {type === "percentage" && (
          <input
            name="max_discount_amount"
            type="number"
            placeholder="Tope de descuento en CLP (opcional)"
            className="w-full rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
          />
        )}

        <div>
          <p className="text-xs text-foreground/60">
            Alcance (opcional — dejá todo en blanco para que aplique a todo el carrito)
          </p>
          <div className="mt-1 grid grid-cols-3 gap-2">
            <select
              name="department_id"
              defaultValue=""
              className="rounded-md border border-charcoal-border bg-background px-2 py-1.5 text-xs"
            >
              <option value="">Departamento</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              name="category_id"
              defaultValue=""
              className="rounded-md border border-charcoal-border bg-background px-2 py-1.5 text-xs"
            >
              <option value="">Categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              name="product_id"
              defaultValue=""
              className="rounded-md border border-charcoal-border bg-background px-2 py-1.5 text-xs"
            >
              <option value="">Producto</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            name="min_order_amount"
            type="number"
            placeholder="Mínimo de compra (opcional)"
            className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
          />
          <input
            name="max_uses"
            type="number"
            placeholder="Usos máximos totales (opcional)"
            className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-foreground/70">
          <input type="checkbox" name="single_use_per_customer" />
          Un solo uso por cliente
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-foreground/60">
            Desde
            <input
              name="starts_at"
              type="datetime-local"
              required
              className="mt-1 w-full rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-foreground/60">
            Hasta
            <input
              name="ends_at"
              type="datetime-local"
              required
              className="mt-1 w-full rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gold px-4 py-1.5 text-sm font-medium text-background hover:bg-gold-hover disabled:opacity-50"
        >
          {pending ? "Creando..." : "Crear promoción"}
        </button>
      </form>
    </div>
  );
}
