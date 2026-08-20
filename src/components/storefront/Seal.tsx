"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/storefront/Logo";

// "Sello del Obrador" — elemento de firma del rediseño (Landing hero y
// confirmación de Checkout). Envuelve el escudo real (Logo.tsx) en un
// círculo de cera para que sea el mismo símbolo de marca en todos lados,
// no un ícono inventado aparte.
export function Seal({
  size = "lg",
  dropOnVisible = false,
  className,
}: {
  size?: "sm" | "lg";
  dropOnVisible?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [dropped, setDropped] = useState(
    () => !dropOnVisible || (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches),
  );

  useEffect(() => {
    if (!dropOnVisible || !ref.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setDropped(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.5 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [dropOnVisible]);

  const dims = size === "sm" ? "h-10 w-10" : "h-[84px] w-[84px]";
  const logoDims = size === "sm" ? "h-6 w-6" : "h-11 w-11";

  return (
    <div
      ref={ref}
      className={`relative flex ${dims} shrink-0 items-center justify-center rounded-full border-2 border-gold bg-masa shadow-[0_0_0_6px_rgba(12,10,8,0.6),0_18px_40px_-12px_rgba(212,175,55,0.35)] transition-all duration-700 ease-[cubic-bezier(.2,1.1,.4,1)] ${
        dropped ? "translate-y-0 scale-100 rotate-0 opacity-100" : "-translate-y-24 scale-150 -rotate-12 opacity-0"
      } ${className ?? ""}`}
      style={{
        background:
          "radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--color-gold) 22%, transparent), transparent 65%), var(--color-masa)",
      }}
    >
      <div className="pointer-events-none absolute inset-2 rounded-full border border-dashed border-gold/50" />
      <Logo iconClassName={`${logoDims} object-contain`} />
    </div>
  );
}
