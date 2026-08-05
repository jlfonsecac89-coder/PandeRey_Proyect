import crypto from "node:crypto";

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

export function orderPrepSlaMinutes(): number {
  return Number(process.env.ORDER_PREP_SLA_MINUTES ?? 30);
}

export function maxDeliveryIssueWaitMinutes(): number {
  return Number(process.env.MAX_DELIVERY_ISSUE_WAIT_MINUTES ?? 10);
}
