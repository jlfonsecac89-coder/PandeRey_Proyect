import "server-only";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

// Sin dominio verificado en Resend solo se puede enviar a la cuenta dueña del
// API key (sandbox "onboarding@resend.dev"). Al verificar el dominio de la
// tienda basta con definir RESEND_FROM_ADDRESS (ej. "Pan de Rey
// <pedidos@tudominio.cl>") en Vercel, sin tocar código.
const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || "Pan de Rey <onboarding@resend.dev>";

let cachedClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  cachedClient = new Resend(apiKey);
  return cachedClient;
}

// Único punto de envío de emails transaccionales — siempre registra el
// resultado en `notifications_log` (sección 15 del blueprint), incluso si
// Resend no está configurado todavía, para que el registro de intentos no
// dependa de que la integración esté completa.
export async function sendNotification(params: {
  userId: string | null;
  orderId: string | null;
  to: string;
  template: string;
  subject: string;
  html: string;
}): Promise<"sent" | "failed"> {
  const client = getResendClient();
  let status: "sent" | "failed" = "failed";

  if (client) {
    try {
      const result = await client.emails.send({
        from: FROM_ADDRESS,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });
      if (!result.error) status = "sent";
    } catch {
      status = "failed";
    }
  }

  const supabase = createAdminClient();
  await supabase.from("notifications_log").insert({
    user_id: params.userId,
    order_id: params.orderId,
    channel: "email",
    template: params.template,
    status,
  });

  return status;
}

// Los emails transaccionales de pedidos van al email de auth.users — no vive
// en `profiles` (sección 05: profiles no duplica el email de auth).
export async function getUserEmail(userId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data.user) return null;
  return data.user.email ?? null;
}
