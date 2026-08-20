"use client";

import { useEffect, useRef, useState } from "react";

// Patrón compartido de "aparece al hacer scroll" para las secciones del
// storefront rediseñado — evita repetir el IntersectionObserver a mano en
// cada sección de Landing/Tienda. Con prefers-reduced-motion activo, el
// elemento queda visible desde el montaje (sin animación de entrada).
function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(prefersReducedMotion);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.15 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  return { ref, visible };
}
