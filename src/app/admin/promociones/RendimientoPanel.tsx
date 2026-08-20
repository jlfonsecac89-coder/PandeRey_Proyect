import { formatCLP } from "@/lib/format";

// Paso 7 del blueprint admin-redesign — extraído tal cual de
// analisis-ofertas/page.tsx (mismas queries, mismo cálculo), con 4 KPIs de
// resumen agregados encima a partir de los mismos datos ya calculados (sin
// query nueva): la página vieja no tenía tarjetas de resumen, solo las 2
// tablas — se agregan acá porque son el punto de entrada natural de la
// pestaña "Rendimiento".

type Promotion = {
  id: string;
  code: string | null;
  name: string;
  type: string;
  value: number;
  max_uses: number | null;
  usage_count: number;
  starts_at: string;
  ends_at: string;
};
type PromoStats = { discount: number; revenue: number; orders: number };
type ProductStat = { name: string; withDiscount: number; withoutDiscount: number };

export function RendimientoPanel({
  promotions,
  byPromotion,
  newCustomersByPromotion,
  topProducts,
}: {
  promotions: Promotion[];
  byPromotion: Map<string, PromoStats>;
  newCustomersByPromotion: Map<string, number>;
  topProducts: ProductStat[];
}) {
  const totalRevenue = [...byPromotion.values()].reduce((sum, s) => sum + s.revenue, 0);
  const totalDiscount = [...byPromotion.values()].reduce((sum, s) => sum + s.discount, 0);
  const totalRedeemed = [...byPromotion.values()].reduce((sum, s) => sum + s.orders, 0);
  const mostUsed = promotions.reduce<Promotion | null>(
    (best, p) => (!best || p.usage_count > best.usage_count ? p : best),
    null,
  );

  return (
    <div className="space-y-10">
      <p className="text-sm text-foreground/60">Cruce de cupones/promociones contra pedidos y canjes reales — solo lectura.</p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
          <p className="text-xs uppercase tracking-wide text-foreground-muted">Ingresos por promos</p>
          <p className="mt-1.5 font-display text-2xl font-medium text-foreground">{formatCLP(totalRevenue)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
          <p className="text-xs uppercase tracking-wide text-foreground-muted">Descuento otorgado</p>
          <p className="mt-1.5 font-display text-2xl font-medium text-orange-400">{formatCLP(totalDiscount)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
          <p className="text-xs uppercase tracking-wide text-foreground-muted">Cupones canjeados</p>
          <p className="mt-1.5 font-display text-2xl font-medium text-gold">{totalRedeemed}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
          <p className="text-xs uppercase tracking-wide text-foreground-muted">Cupón más usado</p>
          <p className="mt-1.5 truncate font-display text-lg font-medium text-foreground" title={mostUsed?.name}>
            {mostUsed ? (mostUsed.code ?? mostUsed.name) : "—"}
          </p>
        </div>
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
            {promotions.map((p) => {
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
            {promotions.length === 0 && (
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
