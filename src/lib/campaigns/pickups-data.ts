import "server-only";
import { createClient } from "@/lib/supabase/server";

export type PickupLine = {
  pickupId: string;
  orderId: string;
  orderNumber: number;
  orderStatus: string;
  receiptNumber: string | null;
  customerName: string;
  customerPhone: string | null;
  productName: string;
  campaignId: string;
  campaignName: string;
  pickupDate: string;
  quantity: number;
  pickedUpAt: string | null;
};

export type PickupDay = {
  id: string;
  campaignId: string;
  campaignName: string;
  date: string;
  capacity: number;
  isOpen: boolean;
};

const PAGE = 1000;
const CHUNK = 100;

type Filters = { campaignId?: string; from?: string; to?: string };

// Días de retiro (de una o todas las campañas) dentro de un rango de fechas.
export async function getPickupDays({ campaignId, from, to }: Filters): Promise<PickupDay[]> {
  const supabase = await createClient();
  let query = supabase
    .from("campaign_pickup_dates")
    .select("id, campaign_id, pickup_date, daily_capacity_units, is_open, campaign:campaigns(name)")
    .order("pickup_date");
  if (campaignId) query = query.eq("campaign_id", campaignId);
  if (from) query = query.gte("pickup_date", from);
  if (to) query = query.lte("pickup_date", to);

  const { data } = await query;
  return (data ?? []).map((d) => {
    const campaign = Array.isArray(d.campaign) ? d.campaign[0] : d.campaign;
    return {
      id: d.id,
      campaignId: d.campaign_id,
      campaignName: campaign?.name ?? "—",
      date: d.pickup_date,
      capacity: d.daily_capacity_units,
      isOpen: d.is_open,
    };
  });
}

// Retiros comprometidos de esos días. Solo cuentan pedidos con pago confirmado
// (tienen N°) y no cancelados: los borradores de Mercado Pago no son retiros.
// Se filtra en código porque PostgREST no filtra bien por columnas de un join
// con alias, y el volumen de una campaña es de cientos de filas, no millones.
export async function getPickupLines(days: PickupDay[]): Promise<PickupLine[]> {
  if (days.length === 0) return [];
  const supabase = await createClient();
  const dayById = new Map(days.map((d) => [d.id, d]));
  const dayIds = days.map((d) => d.id);

  type Row = {
    id: string;
    quantity: number;
    picked_up_at: string | null;
    pickup_date_id: string;
    order: {
      id: string;
      order_number: number | null;
      status: string;
      receipt_number: string | null;
      user_id: string;
    } | null;
  };

  const rows: Row[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data } = await supabase
      .from("order_campaign_pickups")
      .select(
        "id, quantity, picked_up_at, pickup_date_id, order:orders(id, order_number, status, receipt_number, user_id)",
      )
      .in("pickup_date_id", dayIds)
      .order("id")
      .range(offset, offset + PAGE - 1);
    const page = (data ?? []).map((r) => ({
      ...r,
      order: Array.isArray(r.order) ? (r.order[0] ?? null) : r.order,
    })) as Row[];
    rows.push(...page);
    if (page.length < PAGE) break;
  }

  const confirmed = rows.filter((r) => r.order && r.order.order_number != null && r.order.status !== "cancelled");

  const userIds = [...new Set(confirmed.map((r) => r.order!.user_id))];
  const customers = new Map<string, { full_name: string; phone: string | null }>();
  for (let i = 0; i < userIds.length; i += CHUNK) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, phone")
      .in("id", userIds.slice(i, i + CHUNK));
    for (const c of data ?? []) customers.set(c.id, c);
  }

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, product:products(name)")
    .in("id", [...new Set(days.map((d) => d.campaignId))]);
  const productByCampaign = new Map(
    (campaigns ?? []).map((c) => {
      const product = Array.isArray(c.product) ? c.product[0] : c.product;
      return [c.id, product?.name ?? "—"] as const;
    }),
  );

  return confirmed
    .map((r) => {
      const day = dayById.get(r.pickup_date_id)!;
      const customer = customers.get(r.order!.user_id);
      return {
        pickupId: r.id,
        orderId: r.order!.id,
        orderNumber: r.order!.order_number!,
        orderStatus: r.order!.status,
        receiptNumber: r.order!.receipt_number,
        customerName: customer?.full_name ?? "—",
        customerPhone: customer?.phone ?? null,
        productName: productByCampaign.get(day.campaignId) ?? "—",
        campaignId: day.campaignId,
        campaignName: day.campaignName,
        pickupDate: day.date,
        quantity: r.quantity,
        pickedUpAt: r.picked_up_at,
      };
    })
    .sort((a, b) => a.pickupDate.localeCompare(b.pickupDate) || a.orderNumber - b.orderNumber);
}

export type DaySummary = PickupDay & { committed: number; pickedUp: number; pending: number };

// Unidades a producir por día (comprometidas) frente al cupo, y avance de entrega.
export function summarizeDays(days: PickupDay[], lines: PickupLine[]): DaySummary[] {
  return days.map((day) => {
    const own = lines.filter((l) => l.pickupDate === day.date && l.campaignId === day.campaignId);
    const committed = own.reduce((sum, l) => sum + l.quantity, 0);
    const pickedUp = own.filter((l) => l.pickedUpAt).reduce((sum, l) => sum + l.quantity, 0);
    return { ...day, committed, pickedUp, pending: committed - pickedUp };
  });
}
