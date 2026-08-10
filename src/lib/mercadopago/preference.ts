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

// La API de preferencias de Mercado Pago rechaza cualquier ítem con
// unit_price negativo (error genérico al crear la preferencia) — así que un
// cupón/canje de puntos (sección 14) no puede representarse como un ítem
// "descuento" en negativo. En vez de eso, el descuento se prorratea entre
// los ítems reales según su peso en el total, para que la suma que ve
// Mercado Pago siga dando exactamente `orders.total`. El último ítem se
// lleva lo que sobre del redondeo, para no dejar 1-2 pesos sin descontar.
function applyProportionalDiscount(
  items: PreferenceItemInput[],
  discountTotal: number,
): PreferenceItemInput[] {
  const grossTotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  if (discountTotal <= 0 || grossTotal <= 0) return items;
  const capped = Math.min(discountTotal, grossTotal);
  let remaining = capped;

  return items.map((item, idx) => {
    const lineTotal = item.unit_price * item.quantity;
    const isLast = idx === items.length - 1;
    const share = isLast ? remaining : Math.min(lineTotal, Math.round((lineTotal / grossTotal) * capped));
    remaining -= share;
    const discountedLineTotal = Math.max(lineTotal - share, 0);
    // CLP no tiene decimales — redondear evita mandarle a Mercado Pago un
    // unit_price fraccionado que la API puede rechazar.
    return { ...item, unit_price: Math.round(discountedLineTotal / item.quantity) };
  });
}

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
  const finalItems =
    params.discountTotal && params.discountTotal > 0
      ? applyProportionalDiscount(items, params.discountTotal)
      : items;

  const resultUrl = `${siteUrl}/checkout/resultado?order=${params.orderId}`;
  // auto_return exige back_urls públicas por https — en desarrollo local
  // (http://localhost) se omite para no romper la creación de la preferencia.
  const isPublicHttps = siteUrl.startsWith("https://");

  const result = await preference.create({
    body: {
      items: finalItems.map((item) => ({
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
