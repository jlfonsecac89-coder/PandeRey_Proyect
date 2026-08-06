import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatCLP } from "@/lib/format";
import { STATUS_LABELS, type OrderStatus } from "@/lib/orders/status";

export default async function CuentaHomePage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const { data: lastOrder } = await supabase
    .from("orders")
    .select("id, status, total, created_at")
    .eq("user_id", profile.id)
    .neq("status", "pending_payment")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">Mi cuenta</p>
      <h1 className="mt-1 font-display text-2xl font-medium text-foreground">
        Hola, {profile.full_name.split(" ")[0]}
      </h1>
      <p className="mt-1 text-sm text-foreground-muted">Acá tenés un resumen de tu cuenta en Pan de Rey.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-charcoal-border bg-background-elevated p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Puntos disponibles</p>
          <p className="mt-1 font-display text-3xl font-medium text-gold">{profile.points_balance}</p>
          <Link href="/cuenta/puntos" className="mt-2 inline-block text-xs text-gold-hover hover:underline">
            Ver historial →
          </Link>
        </div>

        <div className="rounded-2xl border border-charcoal-border bg-background-elevated p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Último pedido</p>
          {lastOrder ? (
            <>
              <p className="mt-1 text-sm text-foreground">
                {STATUS_LABELS[lastOrder.status as OrderStatus] ?? lastOrder.status} ·{" "}
                <span className="font-semibold text-gold">{formatCLP(lastOrder.total)}</span>
              </p>
              <Link href={`/pedido/${lastOrder.id}`} className="mt-2 inline-block text-xs text-gold-hover hover:underline">
                Ver detalle →
              </Link>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-foreground-muted">Todavía no hiciste ningún pedido.</p>
              <Link href="/tienda" className="mt-2 inline-block text-xs text-gold-hover hover:underline">
                Ir a la tienda →
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Accesos rápidos</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { href: "/cuenta/pedidos", label: "Mis pedidos" },
            { href: "/cuenta/direcciones", label: "Direcciones" },
            { href: "/cuenta/datos", label: "Mis datos" },
            { href: "/seguimiento", label: "Seguir un pedido" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-charcoal-border bg-background-elevated px-4 py-3 text-sm text-foreground transition hover:-translate-y-0.5 hover:border-gold-dark hover:shadow-card"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
