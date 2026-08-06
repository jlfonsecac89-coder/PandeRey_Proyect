import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatCLP } from "@/lib/format";

const ACTIVE_STATUSES = [
  "paid",
  "preparing",
  "ready",
  "ready_for_pickup",
  "driver_assigned",
  "in_route",
  "at_address",
  "delivery_issue",
  "returning_to_store",
  "returned_to_store",
];
const EXCLUDED_FROM_SALES = ["pending_payment", "cancelled"];

function startOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}
function dateNDaysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default async function AdminHomePage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const role = profile.role;
  const isOps = role === "admin" || role === "operaciones";
  const isMarketingView = role === "admin" || role === "marketing";

  const [
    { data: salesToday },
    { data: salesWeek },
    { data: activeOrders },
    { data: recentDelivered },
    { data: bestSellerIds },
    { data: expiringBatches },
    { count: pendingReviewsCount },
    { count: newsletterCount },
  ] = await Promise.all([
    supabase.from("orders").select("total").gte("created_at", startOfDay(new Date())).not("status", "in", `(${EXCLUDED_FROM_SALES.join(",")})`),
    supabase.from("orders").select("total").gte("created_at", daysAgo(7)).not("status", "in", `(${EXCLUDED_FROM_SALES.join(",")})`),
    supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ACTIVE_STATUSES),
    supabase
      .from("orders")
      .select("delivered_at, sla_deadline")
      .eq("status", "delivered")
      .gte("created_at", daysAgo(30))
      .not("delivered_at", "is", null),
    supabase.rpc("get_best_selling_product_ids", { days: 30, limit_count: 5 }),
    isOps
      ? supabase
          .from("product_batches")
          .select("quantity, expiration_date, product:products(name)")
          .gt("quantity", 0)
          .not("expiration_date", "is", null)
          .lte("expiration_date", dateNDaysFromNow(Number(process.env.CLEARANCE_ALERT_DAYS_BEFORE_EXPIRY ?? 3)))
          .order("expiration_date", { ascending: true })
          .limit(8)
      : Promise.resolve({ data: [] as { quantity: number; expiration_date: string; product: { name: string } | { name: string }[] | null }[] }),
    isMarketingView
      ? supabase.from("product_reviews").select("id", { count: "exact", head: true }).eq("status", "pending")
      : Promise.resolve({ count: 0, data: null }),
    isMarketingView
      ? supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("is_active", true)
      : Promise.resolve({ count: 0, data: null }),
  ]);

  const sumTotal = (rows: { total: number }[] | null) => (rows ?? []).reduce((sum, o) => sum + Number(o.total), 0);
  const onTimeDeliveries = (recentDelivered ?? []).filter(
    (o) => o.sla_deadline && new Date(o.delivered_at!) <= new Date(o.sla_deadline),
  );
  const onTimePct = recentDelivered && recentDelivered.length > 0
    ? Math.round((onTimeDeliveries.length / recentDelivered.length) * 100)
    : null;

  let bestSellers: { name: string }[] = [];
  const bestSellerProductIds = (bestSellerIds ?? []).map((r: { product_id: string }) => r.product_id);
  if (bestSellerProductIds.length > 0) {
    const { data } = await supabase.from("products").select("id, name").in("id", bestSellerProductIds);
    const byId = new Map((data ?? []).map((p) => [p.id, p]));
    bestSellers = bestSellerProductIds
      .map((id: string) => byId.get(id))
      .filter((p: { id: string; name: string } | undefined): p is { id: string; name: string } => !!p);
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Panel administrativo</p>
        <h1 className="mt-1 font-display text-3xl font-medium text-foreground">Hola, {profile.full_name}</h1>
      </div>

      {isOps && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-charcoal-border bg-background-elevated p-5 shadow-card">
            <p className="text-xs uppercase tracking-wide text-foreground-muted">Ventas hoy</p>
            <p className="mt-1.5 font-display text-2xl font-medium text-gold">{formatCLP(sumTotal(salesToday))}</p>
          </div>
          <div className="rounded-xl border border-charcoal-border bg-background-elevated p-5 shadow-card">
            <p className="text-xs uppercase tracking-wide text-foreground-muted">Ventas 7 días</p>
            <p className="mt-1.5 font-display text-2xl font-medium text-gold">{formatCLP(sumTotal(salesWeek))}</p>
          </div>
          <div className="rounded-xl border border-charcoal-border bg-background-elevated p-5 shadow-card">
            <p className="text-xs uppercase tracking-wide text-foreground-muted">Pedidos activos</p>
            <p className="mt-1.5 font-display text-2xl font-medium text-foreground">{activeOrders?.length ?? 0}</p>
          </div>
          <div className="rounded-xl border border-charcoal-border bg-background-elevated p-5 shadow-card">
            <p className="text-xs uppercase tracking-wide text-foreground-muted">A tiempo (30 días)</p>
            <p className="mt-1.5 font-display text-2xl font-medium text-foreground">
              {onTimePct !== null ? `${onTimePct}%` : "—"}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-charcoal-border bg-background-elevated p-5 shadow-card">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
            Más vendidos (30 días)
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {bestSellers.map((p, i) => (
              <li key={p.name} className="flex items-center gap-2 text-foreground">
                <span className="text-xs text-gold-dark">{i + 1}.</span> {p.name}
              </li>
            ))}
            {bestSellers.length === 0 && <p className="text-sm text-foreground-muted">Sin ventas todavía.</p>}
          </ul>
        </section>

        {isOps && (
          <section className="rounded-xl border border-charcoal-border bg-background-elevated p-5 shadow-card">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
              Lotes próximos a vencer
            </h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              {(expiringBatches ?? []).map((b, i) => {
                const product = Array.isArray(b.product) ? b.product[0] : b.product;
                return (
                  <li key={i} className="flex justify-between text-foreground">
                    <span>{product?.name}</span>
                    <span className="text-gold-hover">
                      {b.quantity} u. · {new Date(b.expiration_date).toLocaleDateString("es-CL")}
                    </span>
                  </li>
                );
              })}
              {(expiringBatches ?? []).length === 0 && (
                <p className="text-sm text-foreground-muted">Sin lotes próximos a vencer.</p>
              )}
            </ul>
            <Link href="/admin/productos" className="mt-3 inline-block text-xs text-gold-hover hover:underline">
              Ver productos y stock →
            </Link>
          </section>
        )}

        {isMarketingView && (
          <section className="rounded-xl border border-charcoal-border bg-background-elevated p-5 shadow-card">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Marketing</h2>
            <ul className="mt-3 space-y-2 text-sm text-foreground">
              <li className="flex justify-between">
                <span>Reseñas pendientes de moderar</span>
                <Link href="/admin/resenas" className="text-gold-hover hover:underline">
                  {pendingReviewsCount ?? 0}
                </Link>
              </li>
              <li className="flex justify-between">
                <span>Suscriptores activos del newsletter</span>
                <span>{newsletterCount ?? 0}</span>
              </li>
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
