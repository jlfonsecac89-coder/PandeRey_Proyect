"use client";

import { useState, type ReactNode } from "react";

// El sidebar de filtros vive como JSX server-rendered (son <Link> con href
// calculado en el servidor, sin JS propio) — este wrapper client-side solo
// se ocupa de mostrarlo/ocultarlo, así el árbol de filtros no necesita
// convertirse a client component solo para poder colapsarse.
export function TiendaSidebarLayout({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-4 flex items-center gap-2 rounded-full border border-white/10 bg-background-alt/60 px-4 py-1.5 text-sm text-foreground-muted transition hover:border-gold-dark hover:text-gold"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        {open ? "Ocultar filtros" : "Mostrar filtros"}
      </button>

      <div className={`grid grid-cols-1 gap-8 ${open ? "lg:grid-cols-[240px_1fr]" : ""}`}>
        {open && <div>{sidebar}</div>}
        <div>{children}</div>
      </div>
    </div>
  );
}
