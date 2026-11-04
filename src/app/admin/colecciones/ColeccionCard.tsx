"use client";

import { useMemo, useState, useTransition } from "react";
import {
  setCollectionProducts,
  toggleCollectionActive,
  updateCollectionDates,
  type CollectionActionState,
} from "@/lib/catalog/collection-actions";
import type { CollectionStatus } from "@/lib/catalog/collections";

export type ColeccionView = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  status: CollectionStatus;
  startsAt: string;
  endsAt: string;
  productIds: string[];
};

const STATUS_BADGE: Record<CollectionStatus, { text: string; className: string }> = {
  live: { text: "Visible en la tienda", className: "border-gold text-gold" },
  scheduled: { text: "Programada", className: "border-charcoal-border text-foreground-muted" },
  expired: { text: "Vencida", className: "border-red-500/60 text-red-400" },
  inactive: { text: "Desactivada", className: "border-charcoal-border text-foreground-muted" },
};

const inputClass =
  "rounded-md border border-charcoal-border bg-background px-2 py-1 text-sm outline-none focus:border-gold";

export function ColeccionCard({
  collection,
  products,
}: {
  collection: ColeccionView;
  products: { id: string; name: string; is_active: boolean }[];
}) {
  const [message, setMessage] = useState<CollectionActionState>(null);
  const [pending, startTransition] = useTransition();
  const [startsAt, setStartsAt] = useState(collection.startsAt);
  const [endsAt, setEndsAt] = useState(collection.endsAt);
  const [showProducts, setShowProducts] = useState(false);
  const [selected, setSelected] = useState(() => new Set(collection.productIds));
  const [search, setSearch] = useState("");

  function run(fn: () => Promise<CollectionActionState>) {
    setMessage(null);
    startTransition(async () => setMessage(await fn()));
  }

  // La tienda solo muestra colecciones con al menos un producto activo: una
  // vigente pero vacía se avisa para que no parezca un error.
  const savedActiveProducts = products.filter((p) => p.is_active && collection.productIds.includes(p.id)).length;
  const badge =
    collection.status === "live" && savedActiveProducts === 0
      ? { text: "Vigente, pero sin productos activos: no se muestra", className: "border-amber-500/60 text-amber-400" }
      : STATUS_BADGE[collection.status];
  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? products.filter((p) => p.name.toLowerCase().includes(q)) : products;
  }, [products, search]);
  const dirty =
    selected.size !== collection.productIds.length || collection.productIds.some((id) => !selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-foreground">{collection.name}</h2>
          <p className="text-xs text-foreground-muted">
            {selected.size} producto{selected.size === 1 ? "" : "s"} · /tienda?coleccion={collection.slug}
          </p>
          <span className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[10px] ${badge.className}`}>
            {badge.text}
          </span>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => toggleCollectionActive(collection.id, !collection.isActive))}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
            collection.isActive
              ? "border border-charcoal-border text-foreground-muted hover:border-red-400 hover:text-red-400"
              : "bg-gold text-ink hover:bg-gold-hover"
          }`}
        >
          {collection.isActive ? "Desactivar" : "Activar"}
        </button>
      </div>

      {message?.error && <p className="mt-3 text-sm text-burgundy-hover">{message.error}</p>}
      {message?.success && <p className="mt-3 text-sm text-gold-hover">{message.success}</p>}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-xs text-foreground-muted">
          Inicio (hora de Chile, opcional)
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className={`mt-1 block ${inputClass}`}
          />
        </label>
        <label className="text-xs text-foreground-muted">
          Fin (hora de Chile, opcional)
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className={`mt-1 block ${inputClass}`}
          />
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => updateCollectionDates(collection.id, startsAt, endsAt))}
          className="rounded-md border border-charcoal-border px-3 py-1.5 text-xs text-foreground-muted hover:border-gold-dark hover:text-gold disabled:opacity-50"
        >
          Guardar vigencia
        </button>
        <p className="text-[11px] text-foreground-muted">Sin fechas = permanente.</p>
      </div>

      <div className="mt-4 border-t border-white/10 pt-3">
        <button
          type="button"
          onClick={() => setShowProducts((v) => !v)}
          className="text-xs text-gold-hover hover:underline"
        >
          {showProducts ? "Ocultar productos" : "Elegir productos de la colección"}
        </button>

        {showProducts && (
          <div className="mt-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto..."
              className={`w-full max-w-xs ${inputClass}`}
            />
            <ul className="mt-3 grid max-h-64 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
              {visibleProducts.map((p) => (
                <li key={p.id}>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      className="accent-gold"
                    />
                    <span className={p.is_active ? "" : "text-foreground-muted line-through"}>{p.name}</span>
                    {!p.is_active && <span className="text-[10px] text-foreground-muted">(inactivo)</span>}
                  </label>
                </li>
              ))}
              {visibleProducts.length === 0 && <li className="text-xs text-foreground-muted">Sin resultados.</li>}
            </ul>
            <button
              type="button"
              disabled={pending || !dirty}
              onClick={() => run(() => setCollectionProducts(collection.id, [...selected]))}
              className="mt-3 rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-ink hover:bg-gold-hover disabled:opacity-50"
            >
              {pending ? "Guardando..." : "Guardar productos"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
