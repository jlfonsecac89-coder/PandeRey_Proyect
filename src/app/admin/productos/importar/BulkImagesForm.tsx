"use client";

import { useActionState } from "react";
import { bulkUploadProductImages } from "@/lib/catalog/import-actions";
import { FormMessage } from "@/components/auth/AuthCard";

export function BulkImagesForm() {
  const [state, formAction, pending] = useActionState(bulkUploadProductImages, null);

  return (
    <form action={formAction} className="max-w-xl space-y-3 rounded-lg border border-charcoal-border p-4">
      <label htmlFor="files" className="mb-1 block text-xs text-foreground/60">
        Fotos (podés seleccionar varias a la vez)
      </label>
      <input
        id="files"
        name="files"
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp"
        required
        className="w-full text-sm text-foreground/80 file:mr-3 file:rounded-md file:border file:border-white/10 file:bg-white/[0.03] file:px-3 file:py-1.5 file:text-sm file:text-foreground/80"
      />
      <p className="text-xs text-foreground/40">
        Nombrá cada archivo <span className="font-mono">&lt;id-del-producto&gt;-1.jpg</span>,{" "}
        <span className="font-mono">-2.jpg</span>, etc. (hasta 5 por producto). El id es el mismo que aparece en
        el link &quot;Editar&quot; de la tabla de productos.
      </p>
      <FormMessage error={state?.error} success={state?.success} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
      >
        {pending ? "Subiendo..." : "Subir fotos"}
      </button>
    </form>
  );
}
