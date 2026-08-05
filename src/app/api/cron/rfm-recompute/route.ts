import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Vercel Cron llama esta ruta semanalmente (vercel.json) con
// `Authorization: Bearer $CRON_SECRET` — mismo esquema que order-sla.
// Recalcula la segmentación RFM+LTV de todos los clientes (sección 14).
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const windowDays = Number(process.env.RFM_ANALYSIS_WINDOW_DAYS ?? 365);

  const { data, error } = await supabase.rpc("recompute_customer_rfm", { p_window_days: windowDays });

  if (error) {
    return NextResponse.json({ error: "no se pudo recalcular RFM" }, { status: 500 });
  }

  return NextResponse.json({ customersScored: data ?? 0 });
}
