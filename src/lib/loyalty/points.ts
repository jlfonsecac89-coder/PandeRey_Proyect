// Tasas del programa de puntos (sección 14 del blueprint) — configurables
// por variable de entorno (sección 18), no hardcodeadas.
export function loyaltyPointsPerClp(): number {
  return Number(process.env.LOYALTY_POINTS_PER_CLP ?? 0.001);
}

export function loyaltyPointsToClpRate(): number {
  return Number(process.env.LOYALTY_POINTS_TO_CLP_RATE ?? 10);
}

// Puntos acreditados por un pedido pagado — proporcional al monto pagado.
export function computeEarnedPoints(amountClp: number): number {
  return Math.floor(amountClp * loyaltyPointsPerClp());
}

// Descuento en CLP que representa canjear N puntos.
export function computePointsDiscountClp(points: number): number {
  return Math.floor(points * loyaltyPointsToClpRate());
}
