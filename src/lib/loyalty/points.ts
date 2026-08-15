import { getSystemSettings } from "@/lib/settings/system-settings";

// Tasas del programa de puntos (sección 14 del blueprint) — editables desde
// /admin/configuracion/sistema, con la variable de entorno como default si
// nadie configuró nada todavía.
export async function loyaltyPointsPerClp(): Promise<number> {
  return (await getSystemSettings()).loyaltyPointsPerClp;
}

export async function loyaltyPointsToClpRate(): Promise<number> {
  return (await getSystemSettings()).loyaltyPointsToClpRate;
}

// Puntos acreditados por un pedido pagado — proporcional al monto pagado.
export async function computeEarnedPoints(amountClp: number): Promise<number> {
  return Math.floor(amountClp * (await loyaltyPointsPerClp()));
}

// Descuento en CLP que representa canjear N puntos.
export async function computePointsDiscountClp(points: number): Promise<number> {
  return Math.floor(points * (await loyaltyPointsToClpRate()));
}
