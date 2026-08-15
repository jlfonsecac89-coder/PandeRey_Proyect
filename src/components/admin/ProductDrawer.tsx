"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Panel lateral (slide-over) compartido por "Nuevo producto" y "Editar
// producto" — nunca navega a otra pantalla, siempre vuelve a /admin/productos
// (la lista de atrás sigue montada). El translate-x arranca fuera de pantalla
// y se anima al montar porque el proyecto no tiene tailwindcss-animate.
export function ProductDrawer({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // setTimeout en vez de requestAnimationFrame: rAF puede no dispararse
    // nunca en una pestaña sin foco/no visible (se observó exactamente eso
    // en el navegador de pruebas), dejando el panel trabado fuera de pantalla.
    const timer = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  function close() {
    setVisible(false);
    setTimeout(() => router.push("/admin/productos"), 200);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={close}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className="fixed inset-y-0 right-0 flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-background-alt shadow-2xl transition-transform duration-200"
        style={{ transform: visible ? "translateX(0)" : "translateX(100%)" }}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="font-display text-lg font-medium text-foreground">{title}</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar"
            className="rounded-md p-1.5 text-foreground-muted hover:bg-white/[0.05] hover:text-foreground"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
