"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct, uploadProductImage } from "@/lib/catalog/actions";
import { FormMessage } from "@/components/auth/AuthCard";

type Category = { id: string; name: string; department: { name: string } | { name: string }[] };
type Collection = { id: string; name: string };

export function ProductoForm({
  categories,
  collections,
}: {
  categories: Category[];
  collections: Collection[];
}) {
  const [state, formAction, pending] = useActionState(createProduct, null);
  const [isSpecialEvent, setIsSpecialEvent] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [applying, setApplying] = useState(false);
  const applyingRef = useRef(false);
  const router = useRouter();

  // El producto no existe todavía cuando se eligen las fotos (product_id es
  // FK obligatoria en product_images), así que se guardan en memoria acá y
  // recién se suben apenas createProduct devuelve el id — el usuario lo vive
  // como un solo paso ("elegí todo y creé"), aunque abajo sean varias
  // llamadas en cadena. Variantes y stock quedan para después de crear
  // (mismo panel, sin navegar) porque son estructuras más grandes (grupos de
  // opciones, lotes) que no tiene sentido armar dos veces si la creación
  // falla por otro motivo.
  useEffect(() => {
    if (!state?.success || !state.id || applyingRef.current) return;
    applyingRef.current = true;
    const productId = state.id;

    async function applyStaged() {
      setApplying(true);
      for (const file of photoFiles) {
        const fd = new FormData();
        fd.set("product_id", productId);
        fd.set("file", file);
        await uploadProductImage(null, fd);
      }
      router.push(`/admin/productos?editar=${productId}`);
    }
    applyStaged();
  }, [state, photoFiles, router]);

  function onFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 5);
    setPhotoFiles(files);
  }

  const busy = pending || applying;

  return (
    <div className="max-w-xl">
      <FormMessage error={state?.error} success={applying ? undefined : state?.success} />
      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="name" className="mb-1 block text-xs text-foreground/60">
              Nombre <span className="text-red-400">*</span>
            </label>
            <input
              id="name"
              name="name"
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
              defaultValue=""
              className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
            >
              <option value="" disabled>
                Elegir...
              </option>
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
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-xs text-foreground/60">
            Descripción <span className="text-foreground/30">(opcional)</span>
          </label>
          <textarea
            id="description"
            name="description"
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
              required
              className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
            />
          </div>
          <label className="mt-6 flex items-center gap-2 text-sm text-foreground/70">
            <input type="checkbox" name="is_gluten_free" />
            Sin gluten
          </label>
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
              <label
                htmlFor="event_collection_id"
                className="mb-1 block text-xs text-foreground/60"
              >
                Colección de evento <span className="text-red-400">*</span>
              </label>
              <select
                id="event_collection_id"
                name="event_collection_id"
                required={isSpecialEvent}
                defaultValue=""
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
                className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
              />
            </div>
            <label className="col-span-2 flex items-center gap-2 text-xs text-foreground/70">
              <input type="checkbox" name="requires_production_notes" />
              Exigir notas de producción del cliente al comprar
            </label>
          </div>
        )}

        <div>
          <label htmlFor="photos" className="mb-1 block text-xs text-foreground/60">
            Fotos <span className="text-foreground/30">(opcional, hasta 5)</span>
          </label>
          <input
            id="photos"
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            onChange={onFilesChange}
            className="w-full text-sm text-foreground/70 file:mr-3 file:rounded-md file:border-0 file:bg-charcoal-border file:px-3 file:py-1.5 file:text-xs file:text-foreground"
          />
          {photoFiles.length > 0 && (
            <p className="mt-1 text-xs text-foreground/40">
              {photoFiles.length} foto{photoFiles.length === 1 ? "" : "s"} lista{photoFiles.length === 1 ? "" : "s"}{" "}
              para subir al crear.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
        >
          {pending ? "Creando..." : applying ? "Subiendo fotos..." : "Crear producto"}
        </button>
        <p className="text-xs text-foreground/40">
          Variantes y stock (lotes por sucursal) se cargan después de crear el producto — el panel se queda
          abierto y pasa solo a modo edición, con nombre, categoría y fotos ya guardados.
        </p>
      </form>
    </div>
  );
}
