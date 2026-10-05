import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { campaignPhase } from "@/lib/campaigns/types";
import { CampaignCreateForm } from "./CampaignCreateForm";
import { CampaignCard, type CampaignView } from "./CampaignCard";

const CHILE_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Santiago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// Valor para <input type="datetime-local">, en hora de Chile.
function toChileInputValue(iso: string): string {
  const parts = CHILE_PARTS.formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export default async function AdminCampanasPage() {
  await requireRole(["admin"], "/admin-login");
  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ data: campaigns }, { data: products }] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, name, product_id, is_active, orders_open_at, orders_close_at, product:products(name)")
      .order("created_at", { ascending: false }),
    supabase.from("products").select("id, name").eq("is_active", true).order("name"),
  ]);

  const campaignIds = (campaigns ?? []).map((c) => c.id);
  const { data: dates } = campaignIds.length
    ? await supabase
        .from("campaign_pickup_dates")
        .select("id, campaign_id, pickup_date, daily_capacity_units, is_open")
        .in("campaign_id", campaignIds)
        .order("pickup_date")
    : {
        data: [] as {
          id: string;
          campaign_id: string;
          pickup_date: string;
          daily_capacity_units: number;
          is_open: boolean;
        }[],
      };

  const reservedByDate = new Map<string, number>();
  await Promise.all(
    (dates ?? []).map(async (d) => {
      const { data: reserved } = await admin.rpc("campaign_date_reserved", { p_date_id: d.id });
      reservedByDate.set(d.id, reserved ?? 0);
    }),
  );

  const views: CampaignView[] = (campaigns ?? []).map((c) => {
    const product = Array.isArray(c.product) ? c.product[0] : c.product;
    return {
      id: c.id,
      name: c.name,
      productName: product?.name ?? "—",
      isActive: c.is_active,
      phase: campaignPhase(c),
      opensAt: toChileInputValue(c.orders_open_at),
      closesAt: toChileInputValue(c.orders_close_at),
      dates: (dates ?? [])
        .filter((d) => d.campaign_id === c.id)
        .map((d) => ({
          id: d.id,
          date: d.pickup_date,
          capacity: d.daily_capacity_units,
          reserved: reservedByDate.get(d.id) ?? 0,
          isOpen: d.is_open,
        })),
    };
  });

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Venta por encargo</p>
      <h1 className="mt-1 font-display text-2xl font-medium text-foreground">Campañas</h1>
      <p className="mt-1 max-w-2xl text-sm text-foreground-muted">
        Un producto en campaña se vende con pago anticipado y retiro repartido por día, con un cupo diario en
        unidades. Al desactivarla el producto vuelve a la venta general; los pedidos ya pagados se mantienen.
      </p>

      <div className="mt-6 space-y-6">
        {views.map((c) => (
          <CampaignCard key={c.id} campaign={c} />
        ))}
        {views.length === 0 && <p className="text-sm text-foreground-muted">Todavía no hay campañas.</p>}
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-background-alt p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">Nueva campaña</h2>
        <CampaignCreateForm products={products ?? []} />
      </div>
    </div>
  );
}
