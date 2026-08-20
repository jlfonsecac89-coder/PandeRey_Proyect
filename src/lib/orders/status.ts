import crypto from "node:crypto";

// Este archivo se importa desde componentes cliente (AdminOrderRow.tsx, para
// OrderStatus/STATUS_LABELS) — por eso NO puede traer nada que dependa de
// "server-only" (getSystemSettings), ni transitivamente. Las funciones que sí
// lo necesitan viven en status-server.ts, separado a propósito.
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
