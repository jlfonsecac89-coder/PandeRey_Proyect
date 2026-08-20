"use client";

import type { ReactNode } from "react";
import { useScrollReveal } from "@/lib/hooks/useScrollReveal";

// Wrapper cliente para envolver secciones de una página server-rendered
// (Landing, Tienda) con el reveal-on-scroll — la página en sí sigue siendo
// un Server Component, solo esta cáscara necesita el hook.
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const { ref, visible } = useScrollReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      } ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
