"use client";

import { useActionState } from "react";
import { resolveImportRow } from "@/lib/catalog/import-actions";

export function PendingRowActions({ rowId }: { rowId: string }) {
  const [state, formAction, pending] = useActionState(resolveImportRow, null);

  return (
    <div className="flex items-center gap-2">
      <form action={formAction}>
        <input type="hidden" name="row_id" value={rowId} />
        <input type="hidden" name="approve" value="true" />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-gold-dark px-2 py-1 text-xs text-gold-hover hover:bg-gold-dark/10 disabled:opacity-50"
        >
          Aprobar
        </button>
      </form>
      <form action={formAction}>
        <input type="hidden" name="row_id" value={rowId} />
        <input type="hidden" name="approve" value="false" />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-charcoal-border px-2 py-1 text-xs text-foreground/60 hover:border-red-500/60 hover:text-red-400 disabled:opacity-50"
        >
          Rechazar
        </button>
      </form>
      {state?.error && <span className="text-xs text-red-400">{state.error}</span>}
    </div>
  );
}
