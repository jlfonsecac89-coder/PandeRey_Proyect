"use client";

import { useActionState, useState } from "react";
import { updateProduct, type CatalogActionState } from "@/lib/catalog/actions";
import { FormMessage } from "@/components/auth/AuthCard";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_gluten_free: boolean;
  is_active: boolean;
  category_id?: string | null;
  is_special_event?: boolean;
  event_collection_id?: string | null;
  max_orders?: number | null;
  requires_production_notes?: boolean;
};
type Category = { id: string; name: string; department: { name: string } | { name: string }[] };
type Collection = { id: string; name: string };

export function ProductoEditForm({
  product,
  categories,
  collections,
}: {
  product: Product;
  categories: Category[];
  collections: Collection[];
}) {
  const updateWithId = updateProduct.bind(null, product.id) as (
    prev: CatalogActionState,
    formData: FormData,
  ) => Promise<CatalogActionState>;
  const [state, formAction, pending] = useActionState(updateWithId, null);
  const [isSpecialEvent, setIsSpecialEvent] = useState(product.is_special_event ?? false);

  return (
    <div className="max-w-lg">
      <FormMessage error={state?.error} success={state?.success} />
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-xs text-foreground/60">
            Nombre <span className="text-red-400">*</span>
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
          <label htmlFor="category_id" className="mb-1 block text-xs text-foreground/60">
            Categoría / Departamento <span className="text-red-400">*</span>
          </label>
          <select
            id="category_id"
            name="category_id"
            required
            defaultValue={product.category_id ?? ""}
            className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          >
            {categories.map((c) => {
              const dept = Array.isArray(c.department) ? c.department[0] : c.department;
              return (
                <option key={c.id} value={c.id}>
                  {dept?.name} / {c.name}
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <label htmlFor="description" className="mb-1 block text-xs text-foreground/60">
            Descripción <span className="text-foreground/30">(opcional)</span>
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
              Precio (CLP) <span className="text-red-400">*</span>
            </label>
            <input
              id="price"
              name="price"
              type="number"
              min="0"
              step="1"
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

        <label className="flex items-center gap-2 text-sm text-foreground/70">
          <input
            type="checkbox"
            name="is_special_event"
            checked={isSpecialEvent}
            onChange={(e) => setIsSpecialEvent(e.target.checked)}
          />
          Producto de edición limitada (evento)
        </label>

        {isSpecialEvent && (
          <div className="grid grid-cols-2 gap-3 rounded-md border border-gold/20 bg-gold/5 p-3">
            <div>
              <label htmlFor="event_collection_id" className="mb-1 block text-xs text-foreground/60">
                Colección de evento <span className="text-red-400">*</span>
              </label>
              <select
                id="event_collection_id"
                name="event_collection_id"
                required={isSpecialEvent}
                defaultValue={product.event_collection_id ?? ""}
                className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
              >
                <option value="" disabled>
                  Elegir...
                </option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="max_orders" className="mb-1 block text-xs text-foreground/60">
                Cupo máximo <span className="text-foreground/30">(opcional)</span>
              </label>
              <input
                id="max_orders"
                name="max_orders"
                type="number"
                min="1"
                defaultValue={product.max_orders ?? ""}
                className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
              />
            </div>
            <label className="col-span-2 flex items-center gap-2 text-xs text-foreground/70">
              <input
                type="checkbox"
                name="requires_production_notes"
                defaultChecked={product.requires_production_notes ?? false}
              />
              Exigir notas de producción del cliente al comprar
            </label>
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}
