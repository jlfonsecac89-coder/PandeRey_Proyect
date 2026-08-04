import "server-only";
import crypto from "node:crypto";

// Validación de firma de webhooks de Mercado Pago (x-signature/x-request-id).
// Ver https://www.mercadopago.cl/developers — Aceptación 1 de la Fase 4:
// firma inválida => 401, sin crear/modificar `payments` ni `orders`.
export function verifyMercadoPagoSignature(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string;
}): boolean {
  const { xSignature, xRequestId, dataId, secret } = params;
  if (!xSignature || !xRequestId || !dataId) return false;

  const parts: Record<string, string> = {};
  for (const kv of xSignature.split(",")) {
    const [key, value] = kv.split("=").map((s) => s.trim());
    if (key && value) parts[key] = value;
  }

  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
  const expectedHex = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  const expectedBuf = Buffer.from(expectedHex, "hex");
  const actualBuf = Buffer.from(v1, "hex");
  if (expectedBuf.length === 0 || expectedBuf.length !== actualBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}
