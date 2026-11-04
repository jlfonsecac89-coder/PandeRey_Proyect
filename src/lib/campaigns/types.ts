// Client-safe: lo importan componentes de la tienda y del admin.

export type CampaignPhase = "before" | "open" | "closed" | "off";

// Pedidos solo se toman con la campaña activa y dentro de su ventana. Antes de
// abrir el producto se vende normal; pasada la ventana con la campaña aún
// activa queda "cerrado"; desactivada vuelve a venta general.
export function campaignPhase(
  campaign: { is_active: boolean; orders_open_at: string; orders_close_at: string },
  now: Date = new Date(),
): CampaignPhase {
  if (!campaign.is_active) return "off";
  const t = now.getTime();
  if (t < new Date(campaign.orders_open_at).getTime()) return "before";
  if (t > new Date(campaign.orders_close_at).getTime()) return "closed";
  return "open";
}

export type CheckoutCampaignDate = { id: string; date: string; remaining: number };

export type CheckoutCampaign = {
  id: string;
  productId: string;
  name: string;
  dates: CheckoutCampaignDate[];
};

const DATE_LABEL = new Intl.DateTimeFormat("es-CL", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
});

// `ymd` es una fecha de calendario sin hora ("2026-12-20"): se formatea en UTC
// para que la zona del navegador no la corra un día.
export function formatPickupDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return DATE_LABEL.format(new Date(Date.UTC(y, m - 1, d, 12)));
}

// Parte de un pedido de campaña asignada a un día de retiro.
export type OrderCampaignPickup = { date: string; quantity: number; pickedUp: boolean };
