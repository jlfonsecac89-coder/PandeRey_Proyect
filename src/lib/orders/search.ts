import { formatOrderNumber } from "@/lib/format";

// Búsqueda de pedidos en el admin: acepta "PDR-000123", "pdr123", "123" (el
// número a secas) o el prefijo del UUID de los pedidos anteriores a la
// numeración. `q` ya viene en minúscula y sin espacios sobrantes.
export function matchesOrderSearch(order: { id: string; order_number: number | null }, q: string): boolean {
  if (order.id.slice(0, 8).toLowerCase().includes(q)) return true;
  if (order.order_number == null) return false;
  const label = formatOrderNumber(order.order_number).toLowerCase();
  const digits = q.replace(/^pdr-?/, "").replace(/^0+/, "");
  return label.includes(q) || (digits.length > 0 && String(order.order_number).includes(digits));
}
