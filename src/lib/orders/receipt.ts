// N° de boleta emitida a mano en Defontana: lo digita el equipo para cerrar
// un pedido. Mismo criterio de formato en el cierre normal y en el de campaña.
const RECEIPT_FORMAT = /^[A-Za-z0-9-]{1,20}$/;

export function checkReceipt(raw: string | undefined): { receipt: string } | { error: string } {
  const receipt = raw?.trim() ?? "";
  if (!receipt) return { error: "Ingresa el N° de boleta para cerrar el pedido." };
  if (!RECEIPT_FORMAT.test(receipt)) {
    return { error: "El N° de boleta solo admite letras, números y guiones (máx. 20)." };
  }
  return { receipt };
}
