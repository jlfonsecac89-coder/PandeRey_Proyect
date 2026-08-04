import { NextResponse, type NextRequest } from "next/server";
import { verifyMercadoPagoSignature } from "@/lib/mercadopago/webhook";
import { confirmPayment } from "@/lib/mercadopago/confirm-payment";

// Aceptación 1 de la Fase 4: firma inválida => 401 y CERO side-effects.
// Por eso la validación de firma ocurre antes de leer el body o tocar la DB.
export async function POST(request: NextRequest) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "webhook no configurado" }, { status: 500 });
  }

  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");
  const dataId =
    request.nextUrl.searchParams.get("data.id") ?? request.nextUrl.searchParams.get("id");

  const isValid = verifyMercadoPagoSignature({ xSignature, xRequestId, dataId, secret });
  if (!isValid) {
    return NextResponse.json({ error: "firma inválida" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const type = body?.type ?? request.nextUrl.searchParams.get("type");

  if (type !== "payment" || !dataId) {
    return NextResponse.json({ received: true });
  }

  const result = await confirmPayment(dataId);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
