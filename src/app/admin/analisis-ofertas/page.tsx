import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { formatCLP } from "@/lib/format";

const EXCLUDED_STATUSES = ["pending_payment", "cancelled"];

export default async function AnalisisOfertasPage() {
  await requireRole(["admin", "marketing"]);
  const supabase = await createClient();

  const [{ data: promotions }, { data: promoOrders }, { data: allOrders }, { data: itemsWithOrder }] =
    await Promise.all([
      supabase
        .from("promotions")
        .select("id, code, name, type, value, max_uses, usage_count, starts_at, ends_at")
        .order("starts_at", { ascending: false }),
      supabase
        .from("orders")
        .select("id, promotion_id, total, coupon_discount_clp")
        .not("promotion_id", "is", null)
        .not("status", "in", `(${EXCLUDED_STATUSES.join(",")})`),
      supabase
        .from("orders")
        .select("user_id, promotion_id, created_at")
        .not("status", "in", `(${EXCLUDED_STATUSES.join(",")})`)
        .order("created_at", { ascending: true }),
      supabase
        .from("order_items")
        .select("product_id, product_name_snapshot, quantity, order:orders(promotion_id, status)"),
    ]);

  // --- Comparativo por promoción: uso, descuento otorgado, ingresos ---
  const byPromotion = new Map<string, { discount: number; revenue: number; orders: number }>();
  for (const o of promoOrders ?? []) {
    const current = byPromotion.get(o.promotion_id!) ?? { discount: 0, revenue: 0, orders: 0 };
    current.discount += Number(o.coupon_discount_clp ?? 0);
    current.revenue += Number(o.total ?? 0);
    current.orders += 1;
    byPromotion.set(o.promotion_id!, current);
  }

  // --- Captura de nuevos clientes: primer pedido de cada usuario, ¿con qué promo? ---
  const firstOrderByUser = new Map<string, { promotion_id: string | null }>();
  for (const o of allOrders ?? []) {
    if (!firstOrderByUser.has(o.user_id)) firstOrderByUser.set(o.user_id, { promotion_id: o.promotion_id });
  }
  const newCustomersByPromotion = new Map<string, number>();
  for (const first of firstOrderByUser.values()) {
    if (first.promotion_id) {
      newCustomersByPromotion.set(first.promotion_id, (newCustomersByPromotion.get(first.promotion_id) ?? 0) + 1);
    }
  }

  // --- Productos más vendidos con descuento vs sin descuento ---
  // Aproximación a nivel de pedido: un ítem cuenta como "con descuento" si
  // el pedido completo usó algún cupón — no reconstruye si ese cupón
  // específico aplicaba a ese producto en particular (requeriría replicar
  // el alcance histórico exacto del cupón), documentado como tal.
  type ProductStat = { name: string; withDiscount: number; withoutDiscount: number };
  const productStats = new Map<string, ProductStat>();
  for (const item of itemsWithOrder ?? []) {
    const order = Array.isArray(item.order) ? item.order[0] : item.order;
    if (!order || EXCLUDED_STATUSES.includes(order.status)) continue;
    const stat = productStats.get(item.product_id) ?? {
      name: item.product_name_snapshot,
      withDiscount: 0,
      withoutDiscount: 0,
    };
    if (order.promotion_id) stat.withDiscount += item.quantity;
    else stat.withoutDiscount += item.quantity;
    productStats.set(item.product_id, stat);
  }
  const topProducts = [...productStats.values()]
    .filter((s) => s.withDiscount > 0)
    .sort((a, b) => b.withDiscount - a.withDiscount)
    .slice(0, 10);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-gold">Análisis de Ofertas</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Cruce de cupones/promociones contra pedidos y canjes reales — solo lectura.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
          Comparativo de cupones/ofertas
        </h2>
        <table className="mt-3 w-full max-w-4xl text-sm">
          <thead>
            <tr className="border-b border-charcoal-border text-left text-foreground/50">
              <th className="py-2 font-normal">Promoción</th>
              <th className="py-2 font-normal">Uso</th>
              <th className="py-2 font-normal">Descuento otorgado</th>
              <th className="py-2 font-normal">Ventas totales</th>
              <th className="py-2 font-normal">Clientes nuevos captados</th>
            </tr>
          </thead>
          <tbody>
            {(promotions ?? []).map((p) => {
              const stats = byPromotion.get(p.id) ?? { discount: 0, revenue: 0, orders: 0 };
              return (
                <tr key={p.id} className="border-b border-charcoal-border/50">
                  <td className="py-2">
                    {p.name} {p.code && <span className="font-mono text-xs text-gold-dark">({p.code})</span>}
                  </td>
                  <td className="py-2 text-foreground/60">
                    {p.usage_count}
                    {p.max_uses ? ` / ${p.max_uses}` : ""}
                  </td>
                  <td className="py-2 text-foreground/60">{formatCLP(stats.discount)}</td>
                  <td className="py-2 text-foreground/60">{formatCLP(stats.revenue)}</td>
                  <td className="py-2 text-foreground/60">{newCustomersByPromotion.get(p.id) ?? 0}</td>
                </tr>
              );
            })}
            {(promotions ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="py-3 text-foreground/40">
                  Todavía no hay promociones creadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
          Productos más vendidos con descuento
        </h2>
        <p className="mt-1 text-xs text-foreground/40">
          Unidades vendidas en pedidos que usaron algún cupón, vs. pedidos sin cupón.
        </p>
        <table className="mt-3 w-full max-w-2xl text-sm">
          <thead>
            <tr className="border-b border-charcoal-border text-left text-foreground/50">
              <th className="py-2 font-normal">Producto</th>
              <th className="py-2 font-normal">Unidades con descuento</th>
              <th className="py-2 font-normal">Unidades sin descuento</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.map((p) => (
              <tr key={p.name} className="border-b border-charcoal-border/50">
                <td className="py-2">{p.name}</td>
                <td className="py-2 text-foreground/60">{p.withDiscount}</td>
                <td className="py-2 text-foreground/60">{p.withoutDiscount}</td>
              </tr>
            ))}
            {topProducts.length === 0 && (
              <tr>
                <td colSpan={3} className="py-3 text-foreground/40">
                  Todavía no hay ventas con cupón aplicado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
