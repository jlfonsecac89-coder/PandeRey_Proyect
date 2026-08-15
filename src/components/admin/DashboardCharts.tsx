"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCLP } from "@/lib/format";

// `<LabelList>` como hijo de `<Bar>` no pintó nada en recharts 3.x en este
// proyecto (sin error en consola, simplemente no se renderiza) — la prop
// `label` con una función de render manual sí funciona, así que se usa esa
// forma en los dos gráficos de barras.
// Recharts tipa el render prop de `label` contra su propio union `RenderableText`
// (incluye `false`, `ReactElement`, etc.) — más angosto que lo que en la
// práctica manda en runtime. Se tipa como `any` acá adentro nada más, en vez
// de perseguir ese union, porque es una función de render interna simple,
// no una API expuesta al resto del código.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function valueLabel(formatter: (v: number) => string) {
  return (props: any) => {
    const x = Number(props.x ?? 0);
    const y = Number(props.y ?? 0);
    const width = Number(props.width ?? 0);
    const value = Number(props.value ?? 0);
    return (
      <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={11} fill="#E6CCA8">
        {formatter(value)}
      </text>
    );
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function horizontalValueLabel(formatter: (v: number) => string) {
  return (props: any) => {
    const x = Number(props.x ?? 0);
    const y = Number(props.y ?? 0);
    const width = Number(props.width ?? 0);
    const height = Number(props.height ?? 0);
    const value = Number(props.value ?? 0);
    return (
      <text x={x + width + 6} y={y + height / 2} dominantBaseline="middle" fontSize={11} fill="#C9B48C">
        {formatter(value)}
      </text>
    );
  };
}

export type ProductSalesRow = {
  product_id: string;
  product_name: string;
  total_quantity: number;
  total_amount: number;
  ticket_count: number;
};
export type CategorySalesRow = { category_id: string; category_name: string; total_amount: number };

const TOOLTIP_STYLE = {
  background: "#161616",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  fontSize: 12,
};

const TOP_OPTIONS = [5, 10, 15] as const;

// Recharts necesita medir su contenedor en el navegador — no puede
// renderizarse en el servidor, por eso este componente entero es cliente
// aunque los datos ya vengan calculados desde el Dashboard (server component).
// El server manda hasta 15 filas ya ordenadas por monto; el selector de "top"
// solo recorta del lado del cliente, sin pedir de nuevo al servidor.
export function DashboardCharts({
  productSales,
  categorySales,
}: {
  productSales: ProductSalesRow[];
  categorySales: CategorySalesRow[];
}) {
  const [metric, setMetric] = useState<"amount" | "quantity">("amount");
  const [topN, setTopN] = useState<(typeof TOP_OPTIONS)[number]>(5);
  const [productView, setProductView] = useState<"chart" | "table">("chart");

  const sortedByMetric = [...productSales].sort((a, b) =>
    metric === "amount" ? b.total_amount - a.total_amount : b.total_quantity - a.total_quantity,
  );
  const topProducts = sortedByMetric.slice(0, topN);
  const productData = topProducts.map((p) => ({
    name: p.product_name.length > 14 ? `${p.product_name.slice(0, 14)}…` : p.product_name,
    value: metric === "amount" ? p.total_amount : p.total_quantity,
  }));
  const categoryData = categorySales.map((c) => ({
    name: c.category_name.length > 14 ? `${c.category_name.slice(0, 14)}…` : c.category_name,
    value: c.total_amount,
  }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
            Top {topN} productos vendidos
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full border border-white/10 p-0.5 text-[10px] font-semibold uppercase tracking-wide">
              <button
                type="button"
                onClick={() => setProductView("chart")}
                className={`rounded-full px-2.5 py-1 transition ${
                  productView === "chart" ? "bg-gold text-ink" : "text-foreground-muted"
                }`}
              >
                Gráfico
              </button>
              <button
                type="button"
                onClick={() => setProductView("table")}
                className={`rounded-full px-2.5 py-1 transition ${
                  productView === "table" ? "bg-gold text-ink" : "text-foreground-muted"
                }`}
              >
                Tabla
              </button>
            </div>
            <div className="flex rounded-full border border-white/10 p-0.5 text-[10px] font-semibold uppercase tracking-wide">
              {TOP_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTopN(n)}
                  className={`rounded-full px-2.5 py-1 transition ${
                    topN === n ? "bg-gold text-ink" : "text-foreground-muted"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            {productView === "chart" && (
              <div className="flex rounded-full border border-white/10 p-0.5 text-[10px] font-semibold uppercase tracking-wide">
                <button
                  type="button"
                  onClick={() => setMetric("amount")}
                  className={`rounded-full px-2.5 py-1 transition ${
                    metric === "amount" ? "bg-gold text-ink" : "text-foreground-muted"
                  }`}
                >
                  $
                </button>
                <button
                  type="button"
                  onClick={() => setMetric("quantity")}
                  className={`rounded-full px-2.5 py-1 transition ${
                    metric === "quantity" ? "bg-gold text-ink" : "text-foreground-muted"
                  }`}
                >
                  Unidades
                </button>
              </div>
            )}
          </div>
        </div>
        {topProducts.length === 0 ? (
          <p className="mt-6 text-sm text-foreground-muted">Sin ventas todavía.</p>
        ) : productView === "table" ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase tracking-wide text-foreground-muted">
                  <th className="py-2 pr-3 font-medium">Producto</th>
                  <th className="py-2 pr-3 font-medium">Unidades</th>
                  <th className="py-2 pr-3 font-medium">Venta $</th>
                  <th className="py-2 pr-3 font-medium">Tickets</th>
                  <th className="py-2 pr-3 font-medium">Tkt Prom</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {topProducts.map((p) => (
                  <tr key={p.product_id} className="hover:bg-white/[0.02]">
                    <td className="py-2 pr-3 text-foreground">{p.product_name}</td>
                    <td className="py-2 pr-3 text-foreground-muted">{p.total_quantity}</td>
                    <td className="py-2 pr-3 text-foreground-muted">{formatCLP(p.total_amount)}</td>
                    <td className="py-2 pr-3 text-foreground-muted">{p.ticket_count}</td>
                    <td className="py-2 pr-3 text-foreground-muted">
                      {formatCLP(p.ticket_count > 0 ? p.total_amount / p.ticket_count : 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productData} margin={{ top: 20, bottom: 40 }}>
                <CartesianGrid stroke="#222" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#888"
                  fontSize={11}
                  tickLine={false}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                  height={50}
                />
                <YAxis
                  stroke="#888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (metric === "amount" ? formatCLP(v) : String(v))}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => (metric === "amount" ? formatCLP(Number(v)) : Number(v))}
                />
                <Bar
                  isAnimationActive={false}
                  dataKey="value"
                  fill="#D4AF37"
                  radius={[4, 4, 0, 0]}
                  label={valueLabel((v) => (metric === "amount" ? formatCLP(v) : String(v)))}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
          Ventas por categoría
        </h2>
        {categoryData.length === 0 ? (
          <p className="mt-6 text-sm text-foreground-muted">Sin ventas todavía.</p>
        ) : (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ left: 8, right: 40 }}>
                <CartesianGrid stroke="#222" horizontal={false} />
                <XAxis type="number" stroke="#888" fontSize={11} tickFormatter={(v) => formatCLP(v)} />
                <YAxis type="category" dataKey="name" stroke="#888" fontSize={11} width={90} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => formatCLP(Number(v))} />
                <Bar
                  isAnimationActive={false}
                  dataKey="value"
                  fill="#A3835B"
                  radius={[0, 4, 4, 0]}
                  label={horizontalValueLabel((v) => formatCLP(v))}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
