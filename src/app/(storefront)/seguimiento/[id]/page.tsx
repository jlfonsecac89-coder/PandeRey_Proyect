import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCLP } from "@/lib/format";
import { STATUS_LABELS, type OrderStatus } from "@/lib/orders/status";

// Página pública de seguimiento — se llega acá solo después de que
// /seguimiento validó el código + email (lib/orders/tracking.ts), así que
// usa el cliente admin (sin sesión) en vez de depender de RLS por usuario.
export default async function SeguimientoResultadoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, status, delivery_method, total, delivery_confirmation_code, scheduled_at, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();

  const [{ data: history }, { data: items }] = await Promise.all([
    admin
      .from("order_status_history")
      .select("id, status, note, created_at")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
    admin.from("order_items").select("id, product_name_snapshot, quantity, subtotal").eq("order_id", id),
  ]);

  const status = order.status as OrderStatus;
  const showCode = order.delivery_method === "shipping" && !["delivered", "cancelled"].includes(status);

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">Seguimiento de pedido</p>
      <div className="mt-3 flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-medium text-foreground">{STATUS_LABELS[status] ?? status}</h1>
        <p className="font-mono text-xs text-foreground-muted">#{order.id.slice(0, 8).toUpperCase()}</p>
      </div>
      <p className="mt-1 text-sm text-foreground-muted">
        {order.delivery_method === "pickup" ? "Retiro en tienda" : "Envío a domicilio"} · Total{" "}
        {formatCLP(order.total)}
      </p>

      {showCode && order.delivery_confirmation_code && (
        <div className="mt-6 rounded-2xl border border-charcoal-border bg-background-elevated p-5 text-center shadow-card">
          <p className="text-xs text-foreground-muted">
            Código de confirmación — dáselo al repartidor al recibir tu pedido
          </p>
          <p className="mt-2 text-3xl font-bold tracking-[0.3em] text-gold">{order.delivery_confirmation_code}</p>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="mt-6 rounded-2xl border border-charcoal-border bg-background-elevated p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Tu pedido</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between text-foreground/90">
                <span>
                  {item.quantity}× {item.product_name_snapshot}
                </span>
                <span className="text-foreground-muted">{formatCLP(item.subtotal)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Historial</h2>
        <ol className="mt-4 space-y-4 border-l border-charcoal-border pl-4">
          {(history ?? []).map((h) => (
            <li key={h.id}>
              <p className="text-sm font-medium text-foreground">{STATUS_LABELS[h.status as OrderStatus] ?? h.status}</p>
              {h.note && <p className="text-xs text-foreground-muted">{h.note}</p>}
              <p className="text-xs text-foreground-muted/70">{new Date(h.created_at).toLocaleString("es-CL")}</p>
            </li>
          ))}
          {(!history || history.length === 0) && (
            <li className="text-sm text-foreground-muted">Todavía no hay novedades registradas.</li>
          )}
        </ol>
      </div>

      <Link href="/seguimiento" className="mt-8 inline-block text-sm text-gold-hover hover:underline">
        ← Buscar otro pedido
      </Link>
    </div>
  );
}
