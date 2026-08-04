import "server-only";
import { MercadoPagoConfig } from "mercadopago";

let cachedClient: MercadoPagoConfig | null = null;

export function getMercadoPagoClient(): MercadoPagoConfig {
  if (cachedClient) return cachedClient;

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) throw new Error("MP_ACCESS_TOKEN no está configurado.");

  cachedClient = new MercadoPagoConfig({ accessToken });
  return cachedClient;
}
