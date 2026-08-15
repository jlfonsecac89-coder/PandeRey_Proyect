import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type SystemSettings = {
  orderPrepSlaMinutes: number;
  maxDeliveryIssueWaitMinutes: number;
  loyaltyPointsPerClp: number;
  loyaltyPointsToClpRate: number;
};

// Fallback si la fila de la base todavía no existe (ej. justo después de
// correr la migración, antes de que un admin guarde algo por primera vez) —
// mismos defaults que ya tenían las variables de entorno, para no cambiar
// el comportamiento de nadie el día que se aplica esta migración.
export const DEFAULTS: SystemSettings = {
  orderPrepSlaMinutes: Number(process.env.ORDER_PREP_SLA_MINUTES ?? 30),
  maxDeliveryIssueWaitMinutes: Number(process.env.MAX_DELIVERY_ISSUE_WAIT_MINUTES ?? 10),
  loyaltyPointsPerClp: Number(process.env.LOYALTY_POINTS_PER_CLP ?? 0.001),
  loyaltyPointsToClpRate: Number(process.env.LOYALTY_POINTS_TO_CLP_RATE ?? 10),
};

export const KEY_MAP: Record<keyof SystemSettings, string> = {
  orderPrepSlaMinutes: "order_prep_sla_minutes",
  maxDeliveryIssueWaitMinutes: "max_delivery_issue_wait_minutes",
  loyaltyPointsPerClp: "loyalty_points_per_clp",
  loyaltyPointsToClpRate: "loyalty_points_to_clp_rate",
};

// cache() deduplica dentro de un mismo request/render — este archivo se
// importa desde varios puntos (SLA de pedidos, puntos de lealtad) que
// pueden correr en la misma request (ej. confirmar un pago toca ambos).
export const getSystemSettings = cache(async (): Promise<SystemSettings> => {
  const supabase = await createClient();
  const { data } = await supabase.from("system_settings").select("key, value");
  const map = new Map((data ?? []).map((r) => [r.key, r.value]));

  const result = {} as SystemSettings;
  for (const field of Object.keys(KEY_MAP) as (keyof SystemSettings)[]) {
    const raw = map.get(KEY_MAP[field]);
    const parsed = raw !== undefined ? Number(raw) : NaN;
    result[field] = Number.isFinite(parsed) ? parsed : DEFAULTS[field];
  }
  return result;
});
