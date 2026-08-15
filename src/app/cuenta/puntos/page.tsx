import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { loyaltyPointsToClpRate } from "@/lib/loyalty/points";
import { formatCLP } from "@/lib/format";

const TYPE_LABELS: Record<string, string> = {
  earn_purchase: "Ganados por compra",
  redeem_discount: "Canjeados por descuento",
  redeem_product: "Canjeados por producto",
  manual_adjustment: "Ajuste manual",
  expire: "Vencimiento",
};

export default async function PuntosPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const { data: ledger } = await supabase
    .from("points_ledger")
    .select("id, type, points, description, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const rate = await loyaltyPointsToClpRate();

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">Fidelización</p>
      <h1 className="mt-1 font-display text-2xl font-medium text-foreground">Mis puntos</h1>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Saldo actual</p>
        <p className="mt-1 font-display text-3xl font-medium text-gold">{profile.points_balance} puntos</p>
        <p className="mt-1 text-xs text-foreground-muted">
          Equivalen a {formatCLP(profile.points_balance * rate)} de descuento en tu próxima compra.
        </p>
      </div>

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-foreground-muted">Historial</h2>
      <ul className="mt-3 space-y-2">
        {(ledger ?? []).map((entry) => (
          <li
            key={entry.id}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3.5 text-sm shadow-card"
          >
            <div>
              <p className="text-foreground">{TYPE_LABELS[entry.type] ?? entry.type}</p>
              {entry.description && <p className="text-xs text-foreground-muted">{entry.description}</p>}
              <p className="text-xs text-foreground-muted/70">
                {new Date(entry.created_at).toLocaleDateString("es-CL")}
              </p>
            </div>
            <p className={entry.points >= 0 ? "font-semibold text-gold" : "font-semibold text-burgundy"}>
              {entry.points >= 0 ? "+" : ""}
              {entry.points}
            </p>
          </li>
        ))}
        {(ledger ?? []).length === 0 && (
          <p className="text-sm text-foreground-muted">Todavía no tenés movimientos de puntos.</p>
        )}
      </ul>
    </div>
  );
}
