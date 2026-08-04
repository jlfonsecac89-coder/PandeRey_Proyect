import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CheckoutForm } from "@/components/storefront/CheckoutForm";

export default async function CheckoutPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/login?next=/checkout");

  const supabase = await createClient();
  const [{ data: addresses }, { data: stores }] = await Promise.all([
    supabase
      .from("addresses")
      .select("id, label, calle, numero, comuna, ciudad, region")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("stores")
      .select("id, name, contact_address, min_order_amount, free_shipping_min_amount")
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-xl font-semibold text-gold">Checkout</h1>
      <div className="mt-6">
        <CheckoutForm addresses={addresses ?? []} stores={stores ?? []} />
      </div>
    </div>
  );
}
