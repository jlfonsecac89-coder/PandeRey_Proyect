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
      <h1 className="text-xl font-semibold text-gold">Mi Cuenta</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Bienvenido/a, {profile.full_name}.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-charcoal-border bg-charcoal-light p-4">
          <p className="text-xs text-foreground/50">Puntos disponibles</p>
          <p className="text-xl font-bold text-gold">{profile.points_balance}</p>
          <Link href="/cuenta/puntos" className="text-xs text-gold-hover underline">
            Ver historial
          </Link>
        </div>

        <div className="rounded-lg border border-charcoal-border bg-charcoal-light p-4">
          <p className="text-xs text-foreground/50">Último pedido</p>
          {lastOrder ? (
            <>
              <p className="text-sm text-foreground/90">
                {STATUS_LABELS[lastOrder.status as OrderStatus] ?? lastOrder.status} ·{" "}
                {formatCLP(lastOrder.total)}
              </p>
              <Link href={`/pedido/${lastOrder.id}`} className="text-xs text-gold-hover underline">
                Ver detalle
              </Link>
            </>
          ) : (
            <p className="text-sm text-foreground/50">Todavía no hiciste ningún pedido.</p>
          )}
        </div>
      </div>
    </div>
  );
}
