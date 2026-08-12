import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";

// Punto de entrada único para: confirmación de email (signUp) y el redirect
// de vuelta de Google OAuth. Ambos flujos de Supabase Auth usan el mismo
// patrón "code" -> exchangeCodeForSession. La recuperación de contraseña NO
// pasa por acá: Supabase le entrega el token en el fragmento de la URL
// (#access_token=...), que un endpoint de servidor nunca puede leer — ese
// flujo se resuelve del lado del cliente en ActualizarForm.tsx.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    Sentry.captureException(error, { extra: { context: "auth-callback-exchange", next } });
  } else {
    Sentry.captureMessage("auth-callback sin code", { extra: { next } });
  }

  return NextResponse.redirect(`${origin}/auth/login?error=callback`);
}
