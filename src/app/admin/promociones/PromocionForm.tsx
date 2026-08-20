"use client";

import { useActionState, useState } from "react";
import { createPromotion, updatePromotion, type PromotionActionState } from "@/lib/promotions/actions";
import { FormMessage } from "@/components/auth/AuthCard";

type Option = { id: string; name: string };

type ExistingPromotion = {
  id: string;
  code: string | null;
  name: string;
  type: string;
  value: number;
  max_discount_amount: number | null;
  department_id: string | null;
  category_id: string | null;
  product_id: string | null;
  min_order_amount: number | null;
  single_use_per_customer: boolean;
  max_uses: number | null;
  starts_at: string;
  ends_at: string;
  target_segment: string | null;
};

const SEGMENT_OPTIONS = [
  { value: "", label: "Todos los clientes" },
  { value: "estrella", label: "Estrella" },
  { value: "leal", label: "Leal" },
  { value: "promedio", label: "Promedio" },
  { value: "dormido", label: "Dormido" },
  { value: "perdido", label: "Perdido" },
];

// datetime-local necesita "YYYY-MM-DDTHH:mm" en hora local — un timestamptz
// de Supabase viene en UTC, hay que convertirlo para que el input lo muestre
// bien y no se corra de zona horaria al reabrir el form de edición.
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PromocionForm({
  departments,
  categories,
  products,
  promotion,
}: {
  departments: Option[];
  categories: Option[];
  products: Option[];
  promotion?: ExistingPromotion;
}) {
  const isEdit = !!promotion;
  const action = isEdit ? updatePromotion.bind(null, promotion.id) : createPromotion;
  const [state, formAction, pending] = useActionState<PromotionActionState, FormData>(action, null);
  const [type, setType] = useState(promotion?.type ?? "percentage");

  return (
    <div className="max-w-xl rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <h2 className="text-sm font-semibold text-gold">{isEdit ? `Editar — ${promotion.name}` : "Nueva promoción"}</h2>
      <FormMessage error={state?.error} success={state?.success} />
      <form action={formAction} className="mt-2 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input
            name="name"
            placeholder="Nombre"
            defaultValue={promotion?.name}
            required
            className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
          />
          <input
            name="code"
            placeholder="Código (vacío = automática)"
            defaultValue={promotion?.code ?? ""}
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
            defaultValue={promotion?.value}
            required
            className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
          />
        </div>

        {type === "percentage" && (
          <input
            name="max_discount_amount"
            type="number"
            placeholder="Tope de descuento en CLP (opcional)"
            defaultValue={promotion?.max_discount_amount ?? undefined}
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
              defaultValue={promotion?.department_id ?? ""}
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
              defaultValue={promotion?.category_id ?? ""}
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
              defaultValue={promotion?.product_id ?? ""}
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

        <div>
          <label className="text-xs text-foreground/60">
            Segmento de cliente (RFM — opcional)
            <select
              name="target_segment"
              defaultValue={promotion?.target_segment ?? ""}
              className="mt-1 w-full rounded-md border border-charcoal-border bg-background px-2 py-1.5 text-xs"
            >
              {SEGMENT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-1 text-[10px] text-foreground/40">
            Si elegís un segmento, el cupón solo se valida para clientes cuya última segmentación RFM
            (calculada semanalmente) coincida — un cliente sin segmentación calculada todavía no califica.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            name="min_order_amount"
            type="number"
            placeholder="Mínimo de compra (opcional)"
            defaultValue={promotion?.min_order_amount ?? undefined}
            className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
          />
          <input
            name="max_uses"
            type="number"
            placeholder="Usos máximos totales (opcional)"
            defaultValue={promotion?.max_uses ?? undefined}
            className="rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-foreground/70">
          <input type="checkbox" name="single_use_per_customer" defaultChecked={promotion?.single_use_per_customer} />
          Un solo uso por cliente
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-foreground/60">
            Desde
            <input
              name="starts_at"
              type="datetime-local"
              defaultValue={promotion ? toLocalInputValue(promotion.starts_at) : undefined}
              required
              className="mt-1 w-full rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-foreground/60">
            Hasta
            <input
              name="ends_at"
              type="datetime-local"
              defaultValue={promotion ? toLocalInputValue(promotion.ends_at) : undefined}
              required
              className="mt-1 w-full rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-gold px-4 py-1.5 text-sm font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
          >
            {pending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear promoción"}
          </button>
          {isEdit && (
            <a href="/admin/promociones" className="text-xs text-foreground/50 hover:text-gold">
              Cancelar
            </a>
          )}
        </div>
      </form>
    </div>
  );
}
