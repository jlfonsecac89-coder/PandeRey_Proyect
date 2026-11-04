import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { OrderCampaignPickup } from "./types";

// Reparto por día de los pedidos de campaña dados, ordenado por fecha. Los
// pedidos que no son de campaña no aparecen en el mapa. Usa la sesión del
// staff (RLS deja leer order_campaign_pickups a admin/operaciones).
export async function getOrderCampaignPickups(orderIds: string[]): Promise<Map<string, OrderCampaignPickup[]>> {
  const result = new Map<string, OrderCampaignPickup[]>();
  if (orderIds.length === 0) return result;

  const supabase = await createClient();
  const CHUNK = 100;
  for (let i = 0; i < orderIds.length; i += CHUNK) {
    const { data } = await supabase
      .from("order_campaign_pickups")
      .select("order_id, quantity, picked_up_at, date:campaign_pickup_dates(pickup_date)")
      .in("order_id", orderIds.slice(i, i + CHUNK));

    for (const row of data ?? []) {
      const date = (Array.isArray(row.date) ? row.date[0] : row.date)?.pickup_date as string | undefined;
      if (!date) continue;
      const list = result.get(row.order_id) ?? [];
      list.push({ date, quantity: row.quantity, pickedUp: !!row.picked_up_at });
      result.set(row.order_id, list);
    }
  }
  for (const list of result.values()) list.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}
