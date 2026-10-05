import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const pickupLines = order?.scheduled_at ? [PICKUP_FORMATTER.format(new Date(order.scheduled_at))] : [];
  return { storeName: store?.name ?? null, pickupLines };
}
