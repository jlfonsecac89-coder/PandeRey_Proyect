"use client";

import { METROPOLITANA_REGION_NAME, RM_COMUNAS } from "@/lib/geo/chile-regions";

// El despacho a domicilio por ahora solo cubre la Región Metropolitana — no
// tiene sentido pedirle al cliente que elija una región a la que no vamos a
// poder despachar, así que ese campo queda fijo (oculto) y solo se pide la
// comuna, ya filtrada a las que corresponden a esta región.
export function RegionComunaFields({ defaultComuna = "" }: { defaultComuna?: string }) {
  return (
    <>
      <input type="hidden" name="region" value={METROPOLITANA_REGION_NAME} />
      <div className="col-span-2">
        <label htmlFor="comuna" className="mb-1 block text-xs text-foreground/60">
          Comuna
        </label>
        <select
          id="comuna"
          name="comuna"
          required
          defaultValue={defaultComuna}
          className="w-full rounded-md border border-charcoal-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
        >
          <option value="" disabled>
            Elegir comuna...
          </option>
          {RM_COMUNAS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-foreground/50">Por ahora despachamos solo en la Región Metropolitana.</p>
      </div>
    </>
  );
}
