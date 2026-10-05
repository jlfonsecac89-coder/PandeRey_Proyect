import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { campaignPhase, type CampaignPhase, type CheckoutCampaign } from "./types";

export type ProductCampaign = { campaignId: string; name: string; phase: CampaignPhase };

// Estado de campaña de cada producto, para que tienda y checkout decidan si se
// vende normal, por encargo o está cerrado. Cliente admin: lo usa también el
// checkout y la información no depende de la sesión.
export async function getProductCampaigns(productIds: string[]): Promise<Map<string, ProductCampaign>> {
  const result = new Map<string, ProductCampaign>();
  if (productIds.length === 0) return result;

  const { data } = await createAdminClient()
    .from("campaigns")
    .select("id, name, product_id, is_active, orders_open_at, orders_close_at")
    .eq("is_active", true)
    .in("product_id", productIds);

  for (const c of data ?? []) {
    result.set(c.product_id, { campaignId: c.id, name: c.name, phase: campaignPhase(c) });
  }
  return result;
}

// Campañas que hoy reciben pedidos, con las fechas abiertas y el cupo que
// queda en cada una — lo que el checkout muestra para repartir las unidades.
export async function getOpenCampaigns(): Promise<CheckoutCampaign[]> {
  const admin = createAdminClient();
  const { data: campaigns } = await admin
    .from("campaigns")
    .select("id, name, product_id, is_active, orders_open_at, orders_close_at")
    .eq("is_active", true);

  const open = (campaigns ?? []).filter((c) => campaignPhase(c) === "open");
  if (open.length === 0) return [];

  const { data: dates } = await admin
    .from("campaign_pickup_dates")
    .select("id, campaign_id, pickup_date, daily_capacity_units")
    .in("campaign_id", open.map((c) => c.id))
    .eq("is_open", true)
    .order("pickup_date");

  const withRemaining = await Promise.all(
    (dates ?? []).map(async (d) => {
      const { data: reserved } = await admin.rpc("campaign_date_reserved", { p_date_id: d.id });
      return {
        campaignId: d.campaign_id,
        id: d.id,
        date: d.pickup_date as string,
        remaining: Math.max(d.daily_capacity_units - (reserved ?? 0), 0),
      };
    }),
  );

  return open.map((c) => ({
    id: c.id,
    productId: c.product_id,
    name: c.name,
    dates: withRemaining
      .filter((d) => d.campaignId === c.id)
      .map(({ id, date, remaining }) => ({ id, date, remaining })),
  }));
}
