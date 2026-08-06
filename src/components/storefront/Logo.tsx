"use client";

import { useState } from "react";

// El archivo real (crest con corona + espigas) se coloca en public/logo.png
// — mientras no exista, se muestra solo el wordmark en vez de un ícono roto.
export function Logo({ className, iconClassName }: { className?: string; iconClassName?: string }) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      {!imgFailed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/logo.png"
          alt=""
          className={iconClassName ?? "h-8 w-8 object-contain"}
          onError={() => setImgFailed(true)}
        />
      )}
      <span className="font-display text-lg font-semibold tracking-[0.04em]">Pan de Rey</span>
    </span>
  );
}
