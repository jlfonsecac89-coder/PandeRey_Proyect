import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { loyaltyPointsToClpRate } from "@/lib/loyalty/points";
import { CheckoutForm } from "@/components/storefront/CheckoutForm";

export default async function CheckoutPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/login?next=/checkout");

  const supabase = await createClient();
  const [{ data: addresses }, { data: stores }] = await Promise.all([
    supabase
      .from("addresses")
      .select("id, label, calle, numero, comuna, ciudad, region, housing_type, depto_numero")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("stores")
      .select("id, name, contact_address, min_order_amount, free_shipping_min_amount")
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">Paso 2 de 4 — Checkout</p>
      <h1 className="mt-1 font-display text-3xl font-medium text-foreground">Finalizar compra</h1>
      <div className="mt-6">
        <CheckoutForm
          addresses={addresses ?? []}
          stores={stores ?? []}
          pointsBalance={profile.points_balance}
          pointsToClpRate={loyaltyPointsToClpRate()}
        />
      </div>
    </div>
  );
}
