import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  role: "customer" | "admin" | "marketing" | "operaciones" | "repartidor";
  is_active: boolean;
  must_change_password: boolean;
  points_balance: number;
  store_id: string | null;
};

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, phone, role, is_active, must_change_password, points_balance, store_id",
    )
    .eq("id", user.id)
    .single();

  return profile as Profile | null;
}
