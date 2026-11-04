"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { updateRefundPolicyText } from "@/lib/settings/actions";
import {
  DEFAULT_REFUND_TEMPLATE,
  REFUND_TEMPLATE_MAX_LENGTH,
  renderRefundTemplate,
  type RefundPolicy,
} from "@/lib/orders/refund-policy";
import { RefundText } from "@/components/legal/RefundText";
import { FormMessage } from "@/components/auth/AuthCard";

// Edición del texto de "Cancelaciones, devoluciones y reembolsos" en los
// Términos. La vista previa usa los plazos ya guardados arriba.
export function RefundPolicyForm({ template, policy }: { template: string; policy: RefundPolicy }) {
  const [state, formAction, pending] = useActionState(updateRefundPolicyText, null);
  const [text, setText] = useState(template);

  return (
    <form action={formAction} className="space-y-3">
      <FormMessage error={state?.error} success={state?.success} />
      <div>
        <label htmlFor="template" className="mb-1 block text-xs text-foreground/60">
          Texto que ven los clientes en los Términos y Condiciones
        </label>
        <textarea
          id="template"
          name="template"
          rows={12}
          maxLength={REFUND_TEMPLATE_MAX_LENGTH}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:border-gold"
        />
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-foreground/40">
          <span>
            Separa los párrafos con una línea en blanco; **así** va en negrita. Marcadores que se reemplazan solos:{" "}
            <code>{"{plazos}"}</code> (las tres frases de plazos), <code>{"{dias_solicitud}"}</code>,{" "}
            <code>{"{dias_debito}"}</code> y <code>{"{dias_maximo}"}</code>.
          </span>
          <span>
            {text.length}/{REFUND_TEMPLATE_MAX_LENGTH}
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Vista previa</p>
        <div className="mt-2 space-y-2 text-sm leading-relaxed text-foreground/80">
          <RefundText paragraphs={renderRefundTemplate(text, policy)} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Guardar texto"}
        </button>
        <button
          type="button"
          onClick={() => setText(DEFAULT_REFUND_TEMPLATE)}
          className="rounded-md border border-charcoal-border px-3 py-2 text-xs text-foreground-muted hover:border-gold-dark hover:text-gold"
        >
          Cargar texto original
        </button>
        <Link href="/terminos" target="_blank" className="text-xs text-gold-hover hover:underline">
          Ver en los Términos →
        </Link>
      </div>
      <p className="text-xs text-foreground/40">
        Para volver al texto original, cárgalo y guarda. Los plazos en correos y en la página del pedido salen de
        los números de arriba, no de este texto: mantenlos coherentes.
      </p>
    </form>
  );
}
