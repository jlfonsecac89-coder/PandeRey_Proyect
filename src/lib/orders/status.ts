import crypto from "node:crypto";
import { getSystemSettings } from "@/lib/settings/system-settings";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "preparing"
  | "ready"
  | "ready_for_pickup"
  | "driver_assigned"
  | "in_route"
  | "at_address"
  | "delivery_issue"
  | "returning_to_store"
  | "returned_to_store"
  | "delivered"
  | "cancelled";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pendiente de pago",
  paid: "Pago recibido",
  preparing: "En preparación",
  ready: "Preparado",
  ready_for_pickup: "Listo para retirar",
  driver_assigned: "Repartidor asignado",
  in_route: "En camino",
  at_address: "En la dirección",
  delivery_issue: "Problema con la entrega",
  returning_to_store: "Volviendo a la tienda",
  returned_to_store: "De vuelta en la tienda",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

// 4-6 dígitos numéricos, no deriva del UUID del pedido (sección 07 del
// blueprint) — usa crypto.randomInt en vez de Math.random porque es el
// secreto que valida la entrega física.
export function generateDeliveryCode(): string {
  return String(crypto.randomInt(100000, 1000000));
}

// Ahora editable desde /admin/configuracion/sistema sin redeploy — la
// variable de entorno queda solo como default si nadie configuró nada
// todavía (ver src/lib/settings/system-settings.ts).
export async function orderPrepSlaMinutes(): Promise<number> {
  return (await getSystemSettings()).orderPrepSlaMinutes;
}

export async function maxDeliveryIssueWaitMinutes(): Promise<number> {
  return (await getSystemSettings()).maxDeliveryIssueWaitMinutes;
}
