import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Vercel Cron llama esta ruta cada minuto (vercel.json) con
// `Authorization: Bearer $CRON_SECRET` — cualquier otro caller se rechaza,
// para que no sea un endpoint público que dispare transiciones de pedidos.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  // Pedidos `paid` con scheduled_at ya dentro de la ventana de SLA
  // (sla_deadline == scheduled_at, seteado al confirmar el pago) pasan a
  // `preparing` automáticamente — sección 07 del blueprint.
  const { data: dueOrders, error } = await supabase
    .from("orders")
    .select("id")
    .eq("status", "paid")
    .lte("sla_deadline", nowIso);

  if (error) {
    return NextResponse.json({ error: "no se pudo consultar pedidos" }, { status: 500 });
  }

  for (const order of dueOrders ?? []) {
    await supabase.from("orders").update({ status: "preparing" }).eq("id", order.id).eq("status", "paid");
    await supabase.from("order_status_history").insert({
      order_id: order.id,
      status: "preparing",
      changed_by: null,
      note: "Transición automática por SLA (cron)",
    });
  }

  return NextResponse.json({ transitioned: dueOrders?.length ?? 0 });
}
