"use client";

import { useActionState } from "react";
import { updateProduct, type CatalogActionState } from "@/lib/catalog/actions";
import { FormMessage } from "@/components/auth/AuthCard";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_gluten_free: boolean;
  is_active: boolean;
};

export function ProductoEditForm({ product }: { product: Product }) {
  const updateWithId = updateProduct.bind(null, product.id) as (
    prev: CatalogActionState,
    formData: FormData,
  ) => Promise<CatalogActionState>;
  const [state, formAction, pending] = useActionState(updateWithId, null);

  return (
    <div className="max-w-lg">
      <FormMessage error={state?.error} success={state?.success} />
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-xs text-foreground/60">
            Nombre
          </label>
          <input
            id="name"
            name="name"
            defaultValue={product.name}
            required
            className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>
        <div>
          <label htmlFor="description" className="mb-1 block text-xs text-foreground/60">
            Descripción
          </label>
          <textarea
            id="description"
            name="description"
            defaultValue={product.description ?? ""}
            rows={2}
            className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="price" className="mb-1 block text-xs text-foreground/60">
              Precio (CLP)
            </label>
            <input
              id="price"
              name="price"
              type="number"
              min="0"
              defaultValue={product.price}
              required
              className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
            />
          </div>
          <div className="mt-6 flex gap-4">
            <label className="flex items-center gap-2 text-sm text-foreground/70">
              <input type="checkbox" name="is_gluten_free" defaultChecked={product.is_gluten_free} />
              Sin gluten
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground/70">
              <input type="checkbox" name="is_active" defaultChecked={product.is_active} />
              Activo
            </label>
          </div>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-background hover:bg-gold-hover disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}
