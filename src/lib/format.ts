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

// N° de pedido que ve el cliente y usa el equipo (PDR-000123). Los pedidos
// sin número (borradores sin pago, o anteriores a la migración) caen al
// prefijo del UUID para que nunca se muestre un código vacío.
export function formatOrderNumber(orderNumber: number | null | undefined, fallbackId?: string): string {
  if (orderNumber != null) return `PDR-${String(orderNumber).padStart(6, "0")}`;
  return fallbackId ? `#${fallbackId.slice(0, 8).toUpperCase()}` : "—";
}
