import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { noStoreFetch } from "./fetch";

// Cliente para Server Components / Server Actions / Route Handlers.
// Respeta RLS (usa la sesión del usuario que hace el request), a diferencia
// de lib/supabase/admin.ts que usa service_role y la salta por completo.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: noStoreFetch },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Se llamó desde un Server Component (no puede escribir cookies).
            // No pasa nada: middleware.ts se encarga de refrescar la sesión.
          }
        },
      },
    },
  );
}
