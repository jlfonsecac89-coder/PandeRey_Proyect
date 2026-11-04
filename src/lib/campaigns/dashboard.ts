import "server-only";
import { createClient } from "@/lib/supabase/server";
import { chileDateYmd } from "@/lib/stores/schedule";
import { campaignPhase, type CampaignPhase } from "./types";
import { getPickupDays, getPickupLines, summarizeDays } from "./pickups-data";

export type CampaignDashboardRow = {
  id: string;
  name: string;
  productName: string;
  phase: CampaignPhase;
  isActive: boolean;
  committed: number;
  capacity: number;
  pickedUp: number;
  pending: number;
  // Unidades que hay que entregar hoy y el próximo día con retiros pendientes.
  todayPending: number;
  nextDay: { date: string; units: number } | null;
};

// Resumen de campañas para el dashboard: las activas y las desactivadas que
// todavía tienen retiros por entregar (un pedido pagado se respeta aunque la
// campaña se apague).
export async function getCampaignDashboard(): Promise<CampaignDashboardRow[]> {
  const supabase = await createClient();
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, is_active, orders_open_at, orders_close_at, product:products(name)")
    .order("created_at", { ascending: false });
  if (!campaigns || campaigns.length === 0) return [];

  const days = await getPickupDays({});
  const lines = await getPickupLines(days);
  const summaries = summarizeDays(days, lines);

  const today = chileDateYmd(new Date());
  const todayKey = `${today.y}-${String(today.m).padStart(2, "0")}-${String(today.d).padStart(2, "0")}`;

  const rows = campaigns.map((c): CampaignDashboardRow => {
    const own = summaries.filter((s) => s.campaignId === c.id);
    const product = Array.isArray(c.product) ? c.product[0] : c.product;
    const next = own.find((s) => s.date >= todayKey && s.pending > 0);
    return {
      id: c.id,
      name: c.name,
      productName: product?.name ?? "—",
      phase: campaignPhase(c),
      isActive: c.is_active,
      committed: own.reduce((sum, s) => sum + s.committed, 0),
      // Un día ya pasado y sin ventas no es cupo disponible: contarlo
      // subestimaría el avance de la campaña.
      capacity: own.filter((s) => s.date >= todayKey || s.committed > 0).reduce((sum, s) => sum + s.capacity, 0),
      pickedUp: own.reduce((sum, s) => sum + s.pickedUp, 0),
      pending: own.reduce((sum, s) => sum + s.pending, 0),
      todayPending: own.find((s) => s.date === todayKey)?.pending ?? 0,
      nextDay: next ? { date: next.date, units: next.pending } : null,
    };
  });

  return rows.filter((r) => r.isActive || r.pending > 0);
}
