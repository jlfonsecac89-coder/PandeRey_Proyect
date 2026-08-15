"use client";

import { useActionState } from "react";
import { importProductsCsv } from "@/lib/catalog/import-actions";
import { FormMessage } from "@/components/auth/AuthCard";

export function ImportForm() {
  const [state, formAction, pending] = useActionState(importProductsCsv, null);

  return (
    <form action={formAction} className="max-w-xl space-y-3 rounded-lg border border-charcoal-border p-4">
      <div className="flex items-center justify-between">
        <label htmlFor="file" className="block text-xs text-foreground/60">
          Archivo CSV
        </label>
        <a
          href="/admin/productos/importar/plantilla"
          className="text-xs text-gold-dark hover:text-gold hover:underline"
        >
          Descargar modelo (.csv)
        </a>
      </div>
      <input
        id="file"
        name="file"
        type="file"
        accept=".csv,text/csv"
        required
        className="w-full text-sm text-foreground/80 file:mr-3 file:rounded-md file:border file:border-white/10 file:bg-white/[0.03] file:px-3 file:py-1.5 file:text-sm file:text-foreground/80"
      />
      <p className="text-xs text-foreground/40">
        Columnas: departamento_codigo, categoria_codigo, nombre, descripcion,
        precio, sin_gluten, grupo_opcion, valor_opcion, recargo_opcion (las
        últimas 3 son opcionales, solo para agregar una variante).
      </p>
      <FormMessage error={state?.error} success={state?.success} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
      >
        {pending ? "Procesando..." : "Importar"}
      </button>
    </form>
  );
}
