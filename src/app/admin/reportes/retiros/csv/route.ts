import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { getPickupDays, getPickupLines } from "@/lib/campaigns/pickups-data";
import { pickupLinesToCsv } from "@/lib/campaigns/pickups-csv";

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  await requireRole(["admin", "operaciones"], "/admin-login");

  const params = request.nextUrl.searchParams;
  const campaign = params.get("campana") ?? "";
  const from = params.get("desde") ?? "";
  const to = params.get("hasta") ?? "";
  const estado = params.get("estado");

  const days = await getPickupDays({
    campaignId: UUID.test(campaign) ? campaign : undefined,
    from: YMD.test(from) ? from : undefined,
    to: YMD.test(to) ? to : undefined,
  });
  let lines = await getPickupLines(days);
  if (estado === "retirados") lines = lines.filter((l) => l.pickedUpAt);
  if (estado === "pendientes") lines = lines.filter((l) => !l.pickedUpAt);

  return new NextResponse(pickupLinesToCsv(lines), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="retiros.csv"',
    },
  });
}
