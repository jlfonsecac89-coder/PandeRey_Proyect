// Validación de RUT chileno (módulo 11) — se usa tanto en el cliente
// (feedback inmediato) como en el servidor (nunca se confía solo en la
// validación del cliente, mismo principio del resto del proyecto).
export function cleanRut(rut: string): string {
  return rut.replace(/[.\s]/g, "").toUpperCase();
}

function computeCheckDigit(body: string): string {
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return "0";
  if (remainder === 10) return "K";
  return String(remainder);
}

export function isValidRut(rut: string): boolean {
  const cleaned = cleanRut(rut).replace("-", "");
  if (!/^\d{7,8}[0-9K]$/.test(cleaned)) return false;
  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  return computeCheckDigit(body) === dv;
}

export function formatRut(rut: string): string {
  const cleaned = cleanRut(rut).replace("-", "");
  if (cleaned.length < 2) return cleaned;
  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  return `${body}-${dv}`;
}
