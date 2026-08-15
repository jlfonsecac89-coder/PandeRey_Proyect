"use client";

import { useState } from "react";

// Acordeón simple para las secciones del drawer de producto — antes todo
// (fotos, variantes, colecciones, stock) se mostraba expandido y apilado de
// una, lo que hacía que el panel se sintiera saturado incluso con datos
// mínimos. Ahora cada sección abre/cierra por separado y muestra un
// contador en el título para saber qué tiene contenido sin abrirla.
export function DrawerSection({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground/70">
          {title}
          {typeof count === "number" && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal ${
                count > 0 ? "bg-gold/15 text-gold-hover" : "bg-white/5 text-foreground/40"
              }`}
            >
              {count}
            </span>
          )}
        </span>
        <span className={`text-foreground/40 transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      {open && <div className="border-t border-white/10 px-4 py-4">{children}</div>}
    </section>
  );
}
