import type { OrderStatus } from "./status";

// Agrupa los 12 estados crudos de `orders.status` en las 6 etapas que le
// importan al equipo operativo de un vistazo — el filtro fino por estado
// puntual sigue disponible, pero el pipeline es la vista por defecto.
export type PipelineGroup = "por_preparar" | "listos" | "en_camino" | "problemas" | "entregados" | "cancelados";

export const PIPELINE_GROUPS: Record<PipelineGroup, { label: string; statuses: OrderStatus[] }> = {
  por_preparar: { label: "Por preparar", statuses: ["paid", "preparing"] },
  listos: { label: "Listos", statuses: ["ready", "ready_for_pickup"] },
  en_camino: { label: "En camino", statuses: ["driver_assigned", "in_route", "at_address"] },
  problemas: { label: "Con problemas", statuses: ["delivery_issue", "returning_to_store", "returned_to_store"] },
  entregados: { label: "Entregados", statuses: ["delivered"] },
  cancelados: { label: "Cancelados", statuses: ["cancelled"] },
};

export const PIPELINE_ORDER: PipelineGroup[] = [
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
