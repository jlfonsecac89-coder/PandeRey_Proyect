"use client";

import { useState } from "react";

// El archivo real (public/logo.png) ya trae "PAN DE REY" dibujado dentro del
// escudo con su propia tipografía — un wordmark aparte al lado, en la
// tipografía del sitio (Fraunces), no calza con esa letra y queda como dos
// marcas distintas. Se muestra solo la imagen, más grande, sin duplicar el
// nombre en texto.
export function Logo({ className, iconClassName }: { className?: string; iconClassName?: string }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (imgFailed) {
    return <span className={`font-display text-lg font-semibold tracking-[0.04em] ${className ?? ""}`}>Pan de Rey</span>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="Pan de Rey"
      className={`${iconClassName ?? "h-14 w-14"} object-contain ${className ?? ""}`}
      onError={() => setImgFailed(true)}
    />
  );
}
