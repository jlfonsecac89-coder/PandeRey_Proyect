"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";

// Sección 11 del blueprint: consentimiento de cookies (Ley 19.628). Se
// registra en `cookie_consents` — `necessary` siempre true (no se puede
// rechazar, son cookies estrictamente necesarias), `user_id` queda null
// para visitantes sin cuenta (RLS lo permite vía la policy
// anon_insert_cookie_consent, migración 20260810000100).
export async function saveCookieConsent(analytics: boolean, marketing: boolean): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const { error } = await supabase.from("cookie_consents").insert({
    user_id: profile?.id ?? null,
    necessary: true,
    analytics,
    marketing,
  });

  return { ok: !error };
}
