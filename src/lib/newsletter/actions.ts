"use server";

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit/limiter";

export type NewsletterState = { error?: string; success?: string } | null;

// Aceptación 2 de la Fase 10: opt-in explícito (el checkbox nunca viene
// marcado por defecto en el HTML) y se registra consent_at — si no viene
// marcado, no se crea ningún registro.
export async function subscribeNewsletter(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const consent = formData.get("consent") === "on";

  if (!email) return { error: "Ingresá tu email." };
  if (!consent) {
    return { error: "Tenés que aceptar recibir novedades para suscribirte." };
  }

  // Sección 16: 5 requests/hora por IP.
  const ip = await getClientIp();
  const { allowed } = await checkRateLimit("newsletter", ip, 5, 60 * 60);
  if (!allowed) return { error: "Demasiados intentos. Probá de nuevo más tarde." };

  const supabase = await createClient();
  const { error } = await supabase.from("newsletter_subscribers").insert({
    email,
    consent_at: new Date().toISOString(),
  });

  if (error) {
    if (error.code === "23505") {
      return { success: "Ese email ya está suscrito — ¡gracias!" };
    }
    return { error: "No se pudo completar la suscripción." };
  }

  return { success: "¡Listo! Ya estás suscrito a nuestras novedades." };
}
