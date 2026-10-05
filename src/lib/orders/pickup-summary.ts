import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPickupDate } from "@/lib/campaigns/types";

const PICKUP_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// Datos de retiro para la orden de compra: nombre de la sucursal y la fecha
// elegida. Con el cliente admin porque lo llama también el webhook de pagos,
// que no tiene sesión.
export async function buildPickupSummary(orderId: string): Promise<{
  storeName: string | null;
  pickupLines: string[];
}> {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("scheduled_at, store:stores(name)")
    .eq("id", orderId)
    .maybeSingle();

  const store = Array.isArray(order?.store) ? order?.store[0] : order?.store;

  // Pedido de campaña: el retiro es un reparto por día, no un horario.
  const { data: campaignPickups } = await admin
    .from("order_campaign_pickups")
    .select("quantity, date:campaign_pickup_dates(pickup_date)")
    .eq("order_id", orderId);
  if (campaignPickups && campaignPickups.length > 0) {
    const lines = campaignPickups
      .map((p) => ({ date: (Array.isArray(p.date) ? p.date[0] : p.date)?.pickup_date as string, quantity: p.quantity }))
      .filter((p) => p.date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((p) => `${formatPickupDate(p.date)}: ${p.quantity} unidad${p.quantity === 1 ? "" : "es"}`);
    return { storeName: store?.name ?? null, pickupLines: lines };
  }

  const pickupLines = order?.scheduled_at ? [PICKUP_FORMATTER.format(new Date(order.scheduled_at))] : [];
  return { storeName: store?.name ?? null, pickupLines };
}
