"use client";

import { useEffect, useState, useTransition } from "react";
import { useActionState } from "react";
import {
  createOptionGroup,
  createOptionValue,
  deleteOptionGroup,
  deleteOptionValue,
} from "@/lib/catalog/actions";

type OptionValue = { id: string; name: string; price_delta: number };
type OptionGroup = { id: string; name: string; selection_type: string; values: OptionValue[] };
type CatalogEntry = { name: string; selectionType: string; values: { name: string; priceDelta: number }[] };

function ValueChip({ value }: { value: OptionValue }) {
  const [isPending, startTransition] = useTransition();

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-charcoal-border px-2 py-0.5 text-xs text-foreground/70 ${
        isPending ? "opacity-40" : ""
      }`}
    >
      {value.name}
      {value.price_delta ? ` (+$${value.price_delta})` : ""}
      <button
        type="button"
        title="Quitar valor"
        disabled={isPending}
        onClick={() => startTransition(() => deleteOptionValue(value.id))}
        className="text-foreground/30 hover:text-red-400"
      >
        ✕
      </button>
    </span>
  );
}

function ValorForm({
  productId,
  groupId,
  suggestions,
}: {
  productId: string;
  groupId: string;
  suggestions: string[];
}) {
  const [state, formAction, pending] = useActionState(createOptionValue, null);
  const listId = `valores-${groupId}`;

  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-center gap-2">
      <input type="hidden" name="option_group_id" value={groupId} />
      <input type="hidden" name="product_id" value={productId} />
      <input
        name="name"
        placeholder="Manjar"
        required
        list={listId}
        className="rounded-md border border-charcoal-border bg-background px-2 py-1 text-xs outline-none focus:border-gold"
      />
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <input
        name="price_delta"
        type="number"
        step="1"
        placeholder="Recargo $"
        className="w-20 rounded-md border border-charcoal-border bg-background px-2 py-1 text-xs outline-none focus:border-gold"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-charcoal-border px-2 py-1 text-xs text-foreground/70 hover:border-gold-dark hover:text-gold"
      >
        + valor
      </button>
      {state?.error && <span className="text-xs text-red-400">{state.error}</span>}
    </form>
  );
}

function GroupCard({
  group,
  productId,
  catalog,
}: {
  group: OptionGroup;
  productId: string;
  catalog: CatalogEntry[];
}) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const catalogMatch = catalog.find((c) => c.name.toLowerCase() === group.name.toLowerCase());
  const usedValueNames = new Set(group.values.map((v) => v.name.toLowerCase()));
  const valueSuggestions = (catalogMatch?.values ?? [])
    .filter((v) => !usedValueNames.has(v.name.toLowerCase()))
    .map((v) => v.name);

  return (
    <div className={`rounded-lg border border-white/10 bg-white/[0.02] p-3 ${isPending ? "opacity-40" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground/85">
          {group.name}{" "}
          <span className="text-xs font-normal text-foreground/40">
            ({group.selection_type === "single" ? "única selección" : "selección múltiple"})
          </span>
        </p>
        {confirming ? (
          <div className="flex shrink-0 items-center gap-1.5 text-xs">
            <span className="text-foreground/50">¿Eliminar?</span>
            <button
              type="button"
              disabled={isPending}
              onClick={() => startTransition(() => deleteOptionGroup(group.id))}
              className="rounded-md bg-red-500/90 px-2 py-1 font-medium text-white hover:bg-red-500"
            >
              Sí, eliminar
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-md border border-charcoal-border px-2 py-1 text-foreground-muted hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            title="Eliminar grupo completo"
            onClick={() => setConfirming(true)}
            className="shrink-0 text-xs text-foreground/30 hover:text-red-400"
          >
            🗑 Eliminar grupo
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {group.values.map((v) => (
          <ValueChip key={v.id} value={v} />
        ))}
        {group.values.length === 0 && <span className="text-xs text-foreground/30">Sin valores todavía.</span>}
      </div>
      <ValorForm productId={productId} groupId={group.id} suggestions={valueSuggestions} />
    </div>
  );
}

function NuevoGrupoForm({
  productId,
  groups,
  catalog,
}: {
  productId: string;
  groups: OptionGroup[];
  catalog: CatalogEntry[];
}) {
  const [state, formAction, pending] = useActionState(createOptionGroup, null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selectionType, setSelectionType] = useState<"single" | "multiple">("single");

  const usedNames = new Set(groups.map((g) => g.name.trim().toLowerCase()));
  const reusable = catalog.filter((c) => !usedNames.has(c.name.toLowerCase()));
  const matched = catalog.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());

  useEffect(() => {
    if (matched) setSelectionType(matched.selectionType === "multiple" ? "multiple" : "single");
  }, [matched]);

  useEffect(() => {
    if (state?.success) {
      setName("");
      setOpen(false);
    }
  }, [state]);

  if (!open) {
    return (
      <div className="mt-3 space-y-2">
        {reusable.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs text-foreground/50">Reutilizar un grupo que ya usás en otros productos:</p>
            <div className="flex flex-wrap gap-1.5">
              {reusable.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => {
                    setName(c.name);
                    setOpen(true);
                  }}
                  className="rounded-full border border-charcoal-border px-2.5 py-1 text-xs text-foreground-muted transition hover:border-gold-dark hover:text-gold"
                >
                  + {c.name} ({c.values.length})
                </button>
              ))}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-gold-dark hover:text-gold"
        >
          + Crear grupo nuevo
        </button>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="mt-3 space-y-2 rounded-lg border border-gold/20 bg-gold/5 p-3"
    >
      <input type="hidden" name="product_id" value={productId} />
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-foreground/60">Nombre del grupo</label>
          <input
            name="name"
            placeholder="Relleno"
            required
            autoFocus
            list="grupos-existentes"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-charcoal-border bg-background px-2 py-1.5 text-sm outline-none focus:border-gold"
          />
          <datalist id="grupos-existentes">
            {catalog.map((c) => (
              <option key={c.name} value={c.name} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="mb-1 block text-xs text-foreground/60">Tipo</label>
          <select
            name="selection_type"
            value={selectionType}
            onChange={(e) => setSelectionType(e.target.value as "single" | "multiple")}
            className="rounded-md border border-charcoal-border bg-background px-2 py-1.5 text-sm outline-none focus:border-gold"
          >
            <option value="single">Única selección</option>
            <option value="multiple">Selección múltiple</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gold px-3 py-1.5 text-sm font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
        >
          {pending ? "Creando..." : "Crear grupo"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-charcoal-border px-3 py-1.5 text-sm text-foreground-muted hover:border-red-400/60 hover:text-red-400"
        >
          Cancelar
        </button>
      </div>
      {matched && (
        <p className="text-xs text-foreground/40">
          Ya existe como {matched.selectionType === "single" ? "única selección" : "selección múltiple"} en otro
          producto — se creó con ese mismo tipo. Sus valores van a aparecer sugeridos apenas lo crees.
        </p>
      )}
      {state?.error && <p className="text-xs text-red-400">{state.error}</p>}
    </form>
  );
}

export function VariantesSection({
  productId,
  groups,
  catalog,
}: {
  productId: string;
  groups: OptionGroup[];
  catalog: CatalogEntry[];
}) {
  return (
    <div>
      <p className="text-xs text-foreground/40">Relleno, cobertura, tamaño...</p>

      {groups.length > 0 && (
        <div className="mt-2 space-y-2">
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} productId={productId} catalog={catalog} />
          ))}
        </div>
      )}
      {groups.length === 0 && <p className="mt-2 text-sm text-foreground/40">Sin variantes cargadas.</p>}

      <NuevoGrupoForm productId={productId} groups={groups} catalog={catalog} />
    </div>
  );
}
