"use client";

import { useState } from "react";
import { CHILE_REGIONS, getComunasForRegion } from "@/lib/geo/chile-regions";

// Selects encadenados: elegir región filtra las comunas disponibles. Sigue
// enviando `name="region"`/`name="comuna"` como <select> normales — el
// Server Action (saveAddress) no cambia, solo deja de recibir texto libre.
export function RegionComunaFields({
  defaultRegion = "",
  defaultComuna = "",
}: {
  defaultRegion?: string;
  defaultComuna?: string;
}) {
  const [region, setRegion] = useState(defaultRegion);
  const comunas = getComunasForRegion(region);

  return (
    <>
      <div>
        <label htmlFor="region" className="mb-1 block text-xs text-foreground/60">
          Región
        </label>
        <select
          id="region"
          name="region"
          required
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
        >
          <option value="" disabled>
            Elegir región...
          </option>
          {CHILE_REGIONS.map((r) => (
            <option key={r.name} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="comuna" className="mb-1 block text-xs text-foreground/60">
          Comuna
        </label>
        <select
          id="comuna"
          name="comuna"
          required
          disabled={!region}
          defaultValue={defaultComuna}
          className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold disabled:opacity-50"
        >
          <option value="" disabled>
            {region ? "Elegir comuna..." : "Elegí una región primero"}
          </option>
          {comunas.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
