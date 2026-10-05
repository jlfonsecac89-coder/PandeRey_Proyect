"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/rbac";
import { logAction } from "@/lib/audit/log-action";
import { addDaysToYmd, chileWallTimeToUtc } from "@/lib/stores/schedule";

export type CampaignActionState = { error?: string; success?: string } | null;

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;
const MAX_RANGE_DAYS = 60;

// Los inputs datetime-local no traen zona: se interpretan como hora de Chile.
function chileDateTimeToIso(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const [, y, m, d, hh, mm] = match.map(Number);
  return chileWallTimeToUtc(y, m, d, hh, mm).toISOString();
}

function revalidateCampaigns() {
  revalidatePath("/admin/campanas");
  revalidatePath("/tienda");
  revalidatePath("/checkout");
}

export async function createCampaign(_prev: CampaignActionState, formData: FormData): Promise<CampaignActionState> {
  const actor = await requireRole(["admin"]);

  const name = String(formData.get("name") || "").trim();
  const productId = String(formData.get("product_id") || "");
  const opensAt = chileDateTimeToIso(String(formData.get("orders_open_at") || ""));
  const closesAt = chileDateTimeToIso(String(formData.get("orders_close_at") || ""));

  if (!name) return { error: "Ponle un nombre a la campaña." };
  if (!productId) return { error: "Elige el producto de la campaña." };
  if (!opensAt || !closesAt) return { error: "Indica cuándo abren y cierran los pedidos." };
  if (new Date(closesAt) <= new Date(opensAt)) return { error: "El cierre debe ser posterior a la apertura." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .insert({ name, product_id: productId, orders_open_at: opensAt, orders_close_at: closesAt, is_active: false })
    .select("id")
    .single();
  if (error || !data) return { error: "No se pudo crear la campaña." };

  await logAction({
    actor,
    action: "campaign_created",
    entityType: "campaign",
    entityId: data.id,
    after: { name, product_id: productId, orders_open_at: opensAt, orders_close_at: closesAt },
  });
  revalidateCampaigns();
  return { success: "Campaña creada. Agrega las fechas de retiro y actívala cuando esté lista." };
}

export async function scheduleCampaignPickupDates(
  campaignId: string,
  from: string,
  to: string,
  dailyCapacityUnits: number,
): Promise<CampaignActionState> {
  const actor = await requireRole(["admin"]);

  const start = YMD.exec(from);
  const end = YMD.exec(to);
  if (!start || !end) return { error: "Indica la fecha de inicio y de término." };
  if (!Number.isInteger(dailyCapacityUnits) || dailyCapacityUnits < 0) {
    return { error: "El cupo diario debe ser un número entero de unidades." };
  }

  const dates: string[] = [];
  let [y, m, d] = [Number(start[1]), Number(start[2]), Number(start[3])];
  const endKey = `${end[1]}-${end[2]}-${end[3]}`;
  for (let i = 0; i <= MAX_RANGE_DAYS; i++) {
    const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (key > endKey) break;
    dates.push(key);
    ({ y, m, d } = addDaysToYmd(y, m, d, 1));
  }
  if (dates.length === 0) return { error: "El término debe ser igual o posterior al inicio." };
  if (dates.length > MAX_RANGE_DAYS) return { error: `El rango no puede superar ${MAX_RANGE_DAYS} días.` };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("campaign_pickup_dates")
    .select("pickup_date")
    .eq("campaign_id", campaignId);
  const taken = new Set((existing ?? []).map((e) => e.pickup_date as string));
  const toInsert = dates
    .filter((date) => !taken.has(date))
    .map((date) => ({ campaign_id: campaignId, pickup_date: date, daily_capacity_units: dailyCapacityUnits }));
  if (toInsert.length === 0) return { error: "Todas esas fechas ya están en la campaña." };

  const { error } = await supabase.from("campaign_pickup_dates").insert(toInsert);
  if (error) return { error: "No se pudieron agregar las fechas." };

  await logAction({
    actor,
    action: "campaign_dates_added",
    entityType: "campaign",
    entityId: campaignId,
    after: { dates: toInsert.map((t) => t.pickup_date), daily_capacity_units: dailyCapacityUnits },
  });
  revalidateCampaigns();
  return { success: `${toInsert.length} fecha(s) agregada(s).` };
}

export async function setCampaignDateCapacity(dateId: string, dailyCapacityUnits: number): Promise<CampaignActionState> {
  const actor = await requireRole(["admin"]);
  if (!Number.isInteger(dailyCapacityUnits) || dailyCapacityUnits < 0) {
    return { error: "El cupo debe ser un número entero de unidades." };
  }

  // No se puede bajar el cupo por debajo de lo que ya está comprometido.
  const { data: reserved } = await createAdminClient().rpc("campaign_date_reserved", { p_date_id: dateId });
  if (dailyCapacityUnits < (reserved ?? 0)) {
    return { error: `Ya hay ${reserved} unidades comprometidas ese día; el cupo no puede ser menor.` };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("campaign_pickup_dates")
    .update({ daily_capacity_units: dailyCapacityUnits })
    .eq("id", dateId);
  if (error) return { error: "No se pudo guardar el cupo." };

  await logAction({
    actor,
    action: "campaign_capacity_changed",
    entityType: "campaign_pickup_date",
    entityId: dateId,
    after: { daily_capacity_units: dailyCapacityUnits },
  });
  revalidateCampaigns();
  return { success: "Cupo actualizado." };
}

export async function setCampaignDateOpen(dateId: string, isOpen: boolean): Promise<CampaignActionState> {
  const actor = await requireRole(["admin"]);
  const supabase = await createClient();
  const { error } = await supabase.from("campaign_pickup_dates").update({ is_open: isOpen }).eq("id", dateId);
  if (error) return { error: "No se pudo actualizar la fecha." };

  await logAction({
    actor,
    action: isOpen ? "campaign_date_opened" : "campaign_date_closed",
    entityType: "campaign_pickup_date",
    entityId: dateId,
    after: { is_open: isOpen },
  });
  revalidateCampaigns();
  return { success: isOpen ? "Fecha abierta." : "Fecha cerrada." };
}

export async function removeCampaignPickupDate(dateId: string): Promise<CampaignActionState> {
  const actor = await requireRole(["admin"]);

  const { count } = await createAdminClient()
    .from("order_campaign_pickups")
    .select("id", { count: "exact", head: true })
    .eq("pickup_date_id", dateId);
  if ((count ?? 0) > 0) {
    return { error: "Esa fecha ya tiene pedidos. Ciérrala en vez de eliminarla." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("campaign_pickup_dates").delete().eq("id", dateId);
  if (error) return { error: "No se pudo eliminar la fecha." };

  await logAction({ actor, action: "campaign_date_removed", entityType: "campaign_pickup_date", entityId: dateId });
  revalidateCampaigns();
  return { success: "Fecha eliminada." };
}

export async function setCampaignActive(campaignId: string, active: boolean): Promise<CampaignActionState> {
  const actor = await requireRole(["admin"]);
  const supabase = await createClient();

  const { error } = await supabase.from("campaigns").update({ is_active: active }).eq("id", campaignId);
  if (error) {
    // Índice único parcial: un producto no puede estar en dos campañas activas.
    return {
      error:
        error.code === "23505"
          ? "Ese producto ya tiene otra campaña activa. Desactívala primero."
          : "No se pudo cambiar el estado de la campaña.",
    };
  }

  await logAction({
    actor,
    action: active ? "campaign_activated" : "campaign_deactivated",
    entityType: "campaign",
    entityId: campaignId,
    after: { is_active: active },
  });
  revalidateCampaigns();
  return {
    success: active
      ? "Campaña activada."
      : "Campaña desactivada: el producto vuelve a la venta general. Los pedidos ya pagados se mantienen.",
  };
}

export async function rescheduleCampaignWindow(
  campaignId: string,
  ordersOpenAt: string,
  ordersCloseAt: string,
): Promise<CampaignActionState> {
  const actor = await requireRole(["admin"]);
  const opensAt = chileDateTimeToIso(ordersOpenAt);
  const closesAt = chileDateTimeToIso(ordersCloseAt);
  if (!opensAt || !closesAt) return { error: "Indica cuándo abren y cierran los pedidos." };
  if (new Date(closesAt) <= new Date(opensAt)) return { error: "El cierre debe ser posterior a la apertura." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("campaigns")
    .update({ orders_open_at: opensAt, orders_close_at: closesAt })
    .eq("id", campaignId);
  if (error) return { error: "No se pudo guardar la ventana de pedidos." };

  await logAction({
    actor,
    action: "campaign_window_changed",
    entityType: "campaign",
    entityId: campaignId,
    after: { orders_open_at: opensAt, orders_close_at: closesAt },
  });
  revalidateCampaigns();
  return { success: "Ventana de pedidos actualizada." };
}
