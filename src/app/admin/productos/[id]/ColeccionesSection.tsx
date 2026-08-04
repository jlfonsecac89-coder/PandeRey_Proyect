"use client";

import { useTransition } from "react";
import { setProductCollection } from "@/lib/catalog/actions";

type Collection = { id: string; name: string };

export function ColeccionesSection({
  productId,
  allCollections,
  selectedIds,
}: {
  productId: string;
  allCollections: Collection[];
  selectedIds: string[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
        Colecciones
      </h2>
      <p className="mt-1 text-xs text-foreground/40">
        Vitrinas de Marketing — un producto puede estar en varias a la vez.
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        {allCollections.map((c) => (
          <label key={c.id} className="flex items-center gap-1.5 text-sm text-foreground/70">
            <input
              type="checkbox"
              defaultChecked={selectedIds.includes(c.id)}
              disabled={isPending}
              onChange={(e) => {
                const checked = e.target.checked;
                startTransition(() => {
                  setProductCollection(productId, c.id, checked);
                });
              }}
            />
            {c.name}
          </label>
        ))}
        {allCollections.length === 0 && (
          <p className="text-xs text-foreground/40">No hay colecciones creadas todavía.</p>
        )}
      </div>
    </section>
  );
}
