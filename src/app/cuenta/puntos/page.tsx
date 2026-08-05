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

  const rate = loyaltyPointsToClpRate();

  return (
    <div>
      <h1 className="text-xl font-semibold text-gold">Mis puntos</h1>
      <div className="mt-2 rounded-lg border border-charcoal-border bg-charcoal-light p-4">
        <p className="text-sm text-foreground/60">Saldo actual</p>
        <p className="text-2xl font-bold text-gold">{profile.points_balance} puntos</p>
        <p className="text-xs text-foreground/50">
          Equivalen a {formatCLP(profile.points_balance * rate)} de descuento en tu próxima compra.
        </p>
      </div>

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-foreground/50">
        Historial
      </h2>
      <ul className="mt-2 space-y-2">
        {(ledger ?? []).map((entry) => (
          <li
            key={entry.id}
            className="flex items-center justify-between rounded-md border border-charcoal-border bg-charcoal-light p-3 text-sm"
          >
            <div>
              <p className="text-foreground/90">{TYPE_LABELS[entry.type] ?? entry.type}</p>
              {entry.description && <p className="text-xs text-foreground/50">{entry.description}</p>}
              <p className="text-xs text-foreground/40">
                {new Date(entry.created_at).toLocaleDateString("es-CL")}
              </p>
            </div>
            <p className={entry.points >= 0 ? "text-gold" : "text-red-400"}>
              {entry.points >= 0 ? "+" : ""}
              {entry.points}
            </p>
          </li>
        ))}
        {(ledger ?? []).length === 0 && (
          <p className="text-sm text-foreground/50">Todavía no tenés movimientos de puntos.</p>
        )}
      </ul>
    </div>
  );
}
