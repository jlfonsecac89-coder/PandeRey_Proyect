import type { OrderStatus } from "./status";

// Agrupa los 12 estados crudos de `orders.status` en las 6 etapas que le
// importan al equipo operativo de un vistazo — el filtro fino por estado
// puntual sigue disponible, pero el pipeline es la vista por defecto.
export type PipelineGroup =
  | "pago_pendiente"
  | "por_preparar"
  | "listos"
  | "en_camino"
  | "problemas"
  | "entregados"
  | "cancelados";

export const PIPELINE_GROUPS: Record<PipelineGroup, { label: string; statuses: OrderStatus[] }> = {
  // pending_payment normalmente se excluye de la vista por defecto (son en
  // su mayoría carritos de Mercado Pago abandonados a mitad de pago) — este
  // grupo es la única forma de verlos, y es donde vive el pedido mientras
  // se espera confirmar una transferencia a mano.
  pago_pendiente: { label: "Pago pendiente", statuses: ["pending_payment"] },
  por_preparar: { label: "Por preparar", statuses: ["paid", "preparing"] },
  listos: { label: "Listos", statuses: ["ready", "ready_for_pickup"] },
  en_camino: { label: "En camino", statuses: ["driver_assigned", "in_route", "at_address"] },
  problemas: { label: "Con problemas", statuses: ["delivery_issue", "returning_to_store", "returned_to_store"] },
  entregados: { label: "Entregados", statuses: ["delivered"] },
  cancelados: { label: "Cancelados", statuses: ["cancelled"] },
};

export const PIPELINE_ORDER: PipelineGroup[] = [
  "pago_pendiente",
  "por_preparar",
  "listos",
  "en_camino",
  "problemas",
  "entregados",
  "cancelados",
];

export function statusToGroup(status: string): PipelineGroup | null {
  for (const key of PIPELINE_ORDER) {
    if ((PIPELINE_GROUPS[key].statuses as string[]).includes(status)) return key;
  }
  return null;
}
