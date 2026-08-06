import "server-only";
import { Preference } from "mercadopago";
import { getMercadoPagoClient } from "./client";
import { getSiteUrl } from "@/lib/site-url";

export type PreferenceItemInput = {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
};

export async function createOrderPreference(params: {
  orderId: string;
  items: PreferenceItemInput[];
  shippingCost: number;
  discountTotal?: number;
  payerEmail?: string;
}) {
  const client = getMercadoPagoClient();
  const preference = new Preference(client);

  const siteUrl = await getSiteUrl();
  const items = [...params.items];
  if (params.shippingCost > 0) {
    items.push({ id: "envio", title: "Costo de envío", quantity: 1, unit_price: params.shippingCost });
  }
  // Cupón/puntos canjeados (sección 14) — se representan como un ítem de
  // precio negativo para que el total cobrado por MP coincida exactamente
  // con `orders.total` (que ya sale descontado).
  if (params.discountTotal && params.discountTotal > 0) {
    items.push({
      id: "descuento",
      title: "Descuento (cupón/puntos)",
      quantity: 1,
      unit_price: -params.discountTotal,
    });
  }

  const resultUrl = `${siteUrl}/checkout/resultado?order=${params.orderId}`;
  // auto_return exige back_urls públicas por https — en desarrollo local
  // (http://localhost) se omite para no romper la creación de la preferencia.
  const isPublicHttps = siteUrl.startsWith("https://");

  const result = await preference.create({
    body: {
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        currency_id: "CLP",
      })),
      external_reference: params.orderId,
      payer: params.payerEmail ? { email: params.payerEmail } : undefined,
      back_urls: {
        success: resultUrl,
        failure: resultUrl,
        pending: resultUrl,
      },
      auto_return: isPublicHttps ? "approved" : undefined,
      notification_url: `${siteUrl}/api/webhooks/mercadopago`,
    },
  });

  return result;
}
