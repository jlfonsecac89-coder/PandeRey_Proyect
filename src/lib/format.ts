const clpFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export function formatCLP(amount: number): string {
  return clpFormatter.format(amount);
}

const IVA_RATE = 0.19;

// Todos los precios guardados ya incluyen IVA (sección 13: "los precios se
// muestran en pesos chilenos e incluyen los impuestos aplicables") — este
// desglose es puramente de visualización en el checkout, no cambia ningún
// monto almacenado ni cobrado.
export function splitIva(amountWithIva: number): { neto: number; iva: number } {
  const neto = Math.round(amountWithIva / (1 + IVA_RATE));
  return { neto, iva: amountWithIva - neto };
}
