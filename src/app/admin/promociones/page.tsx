import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { formatCLP } from "@/lib/format";
import { togglePromotionActive } from "@/lib/promotions/actions";
import { PromocionForm } from "./PromocionForm";
import { RendimientoPanel } from "./RendimientoPanel";

const EXCLUDED_STATUSES = ["pending_payment", "cancelled"];

const SEGMENT_LABELS: Record<string, string> = {
  estrella: "Estrella",
  leal: "Leal",
  promedio: "Promedio",
  dormido: "Dormido",
  perdido: "Perdido",
};

type Tab = "activos" | "rendimiento";

export default async function PromocionesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; editar?: string }>;
}) {
  await requireRole(["admin", "marketing"]);
  const { tab, editar } = await searchParams;
  const activeTab: Tab = tab === "rendimiento" ? "rendimiento" : "activos";
  const supabase = await createClient();

  const [{ data: promotions }, { data: departments }, { data: categories }, { data: products }, { data: editingPromotion }] =
    await Promise.all([
      supabase
        .from("promotions")
        .select("id, code, name, type, value, usage_count, max_uses, starts_at, ends_at, is_active, target_segment")
        .order("starts_at", { ascending: false }),
      supabase.from("departments").select("id, name").eq("is_active", true).order("name"),
      supabase.from("categories").select("id, name").eq("is_active", true).order("name"),
      supabase.from("products").select("id, name").eq("is_active", true).order("name"),
      // Solo se consulta el detalle completo de UNA promoción cuando el
      // formulario está en modo edición (?editar=<id>) — mismo criterio
      // condicional que ya usa productos/page.tsx con su propio `editar`.
      editar
        ? supabase
            .from("promotions")
            .select(
              "id, code, name, type, value, max_discount_amount, department_id, category_id, product_id, min_order_amount, single_use_per_customer, max_uses, starts_at, ends_at, target_segment",
            )
            .eq("id", editar)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  // Las queries de análisis (más pesadas, cruzan orders/order_items) solo se
  // corren cuando la pestaña "Rendimiento" está activa — mismo criterio que
  // ya usa productos/page.tsx con `editar` (no combinar en una query más
  // pesada para todos los tabs por igual).
  let rendimientoData: {
    promotions: {
      id: string;
      code: string | null;
      name: string;
      type: string;
      value: number;
      max_uses: number | null;
      usage_count: number;
      starts_at: string;
      ends_at: string;
    }[];
    byPromotion: Map<string, { discount: number; revenue: number; orders: number }>;
    newCustomersByPromotion: Map<string, number>;
    topProducts: { name: string; withDiscount: number; withoutDiscount: number }[];
  } | null = null;

  if (activeTab === "rendimiento") {
    const [{ data: analisisPromotions }, { data: promoOrders }, { data: allOrders }, { data: itemsWithOrder }] =
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

    const byPromotion = new Map<string, { discount: number; revenue: number; orders: number }>();
    for (const o of promoOrders ?? []) {
      const current = byPromotion.get(o.promotion_id!) ?? { discount: 0, revenue: 0, orders: 0 };
      current.discount += Number(o.coupon_discount_clp ?? 0);
      current.revenue += Number(o.total ?? 0);
      current.orders += 1;
      byPromotion.set(o.promotion_id!, current);
    }

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

    rendimientoData = {
      promotions: analisisPromotions ?? [],
      byPromotion,
      newCustomersByPromotion,
      topProducts,
    };
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gold">Promociones</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Sin código = promoción automática (se aplica sola dentro del carrito
          elegible). Con código = cupón que el cliente ingresa en el checkout.
        </p>
      </div>

      <div className="flex gap-1 border-b border-charcoal-border">
        {(
          [
            ["activos", "Activos"],
            ["rendimiento", "Rendimiento"],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={key === "activos" ? "/admin/promociones" : "/admin/promociones?tab=rendimiento"}
            className={`border-b-2 px-3 py-2 text-sm transition ${
              activeTab === key
                ? "border-gold text-gold"
                : "border-transparent text-foreground/60 hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {activeTab === "activos" && (
        <div className="max-w-3xl space-y-6">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-charcoal-border text-xs uppercase tracking-wide text-foreground/50">
                <th className="py-2 pr-3 font-normal">Nombre</th>
                <th className="py-2 pr-3 font-normal">Código</th>
                <th className="py-2 pr-3 font-normal">Descuento</th>
                <th className="py-2 pr-3 font-normal">Usos</th>
                <th className="py-2 pr-3 font-normal">Vigencia</th>
                <th className="py-2 pr-3 font-normal">Segmento</th>
                <th className="py-2 pr-3 font-normal">Estado</th>
                <th className="py-2 font-normal">Editar</th>
              </tr>
            </thead>
            <tbody>
              {(promotions ?? []).map((p) => (
                <tr key={p.id} className="border-b border-charcoal-border">
                  <td className="py-2 pr-3">{p.name}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-gold-dark">{p.code ?? "—"}</td>
                  <td className="py-2 pr-3">{p.type === "percentage" ? `${p.value}%` : formatCLP(p.value)}</td>
                  <td className="py-2 pr-3 text-xs text-foreground/60">
                    {p.usage_count}
                    {p.max_uses ? ` / ${p.max_uses}` : ""}
                  </td>
                  <td className="py-2 pr-3 text-xs text-foreground/50">
                    {new Date(p.starts_at).toLocaleDateString("es-CL")} –{" "}
                    {new Date(p.ends_at).toLocaleDateString("es-CL")}
                  </td>
                  <td className="py-2 pr-3 text-xs text-foreground/60">
                    {SEGMENT_LABELS[p.target_segment ?? ""] ?? "Todos"}
                  </td>
                  <td className="py-2 pr-3">
                    <form action={togglePromotionActive.bind(null, p.id, !p.is_active)}>
                      <button
                        type="submit"
                        className={`rounded-full px-2 py-0.5 text-xs ${p.is_active ? "border border-gold text-gold" : "border border-charcoal-border text-foreground/50"}`}
                      >
                        {p.is_active ? "Activa" : "Inactiva"}
                      </button>
                    </form>
                  </td>
                  <td className="py-2">
                    <Link href={`/admin/promociones?editar=${p.id}`} className="text-xs text-gold-hover hover:underline">
                      Editar →
                    </Link>
                  </td>
                </tr>
              ))}
              {(promotions ?? []).length === 0 && (
                <tr>
                  <td colSpan={8} className="py-4 text-foreground/40">
                    Todavía no hay promociones.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <PromocionForm
            departments={departments ?? []}
            categories={categories ?? []}
            products={products ?? []}
            promotion={editingPromotion ?? undefined}
          />
        </div>
      )}

      {activeTab === "rendimiento" && rendimientoData && (
        <RendimientoPanel
          promotions={rendimientoData.promotions}
          byPromotion={rendimientoData.byPromotion}
          newCustomersByPromotion={rendimientoData.newCustomersByPromotion}
          topProducts={rendimientoData.topProducts}
        />
      )}
    </div>
  );
}
