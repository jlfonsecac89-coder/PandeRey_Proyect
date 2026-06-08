/**
 * Formatea un número como pesos chilenos (CLP) con separadores de miles (punto)
 * y de forma consistente entre el servidor y el cliente para evitar errores de hidratación.
 * 
 * Ejemplo: 4500 -> 4.500
 */
export function formatPrice(price: number | undefined | null): string {
  if (price === undefined || price === null || isNaN(price)) return '0';
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
