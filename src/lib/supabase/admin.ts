import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { noStoreFetch } from "./fetch";

// Cliente con service_role — SALTA RLS por completo (sección 10 del blueprint).
// Solo se usa server-side, en operaciones explícitamente privilegiadas:
// creación de cuentas de staff, webhooks, jobs de cron. Nunca en código
// que corre en el navegador ni en un Server Component/Action "normal".
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: noStoreFetch },
    },
  );
}
