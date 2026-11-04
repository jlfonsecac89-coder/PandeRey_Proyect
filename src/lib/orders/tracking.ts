"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export type TrackingState = { error: string } | null;

// Búsqueda pública de pedido (sin sesión) — el cliente ve su N° de pedido
// como PDR-000123 (se acepta con o sin guion y en minúscula). Los pedidos
// anteriores a la numeración se siguen encontrando por prefijo del UUID. En
// ambos casos se exige que el email de auth.users coincida antes de
// redirigir: el email hace de segundo factor y nadie puede ver un pedido
// ajeno solo por probar códigos correlativos.
export async function lookupOrder(_prev: TrackingState, formData: FormData): Promise<TrackingState> {
  const codeRaw = String(formData.get("code") ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9-]/g, "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!codeRaw || !email) {
    return { error: "Ingresa el código de pedido y el email de la compra." };
  }

  const admin = createAdminClient();
  const numberMatch = /^pdr-?0*(\d+)$/i.exec(codeRaw);
  const query = admin.from("orders").select("id, user_id");
  const { data: candidates, error: queryError } = numberMatch
    ? await query.eq("order_number", Number(numberMatch[1])).limit(1)
    : await query.filter("id::text", "ilike", `${codeRaw}%`).limit(5);

  if (queryError || !candidates || candidates.length === 0) {
    return { error: "No encontramos un pedido con ese código." };
  }

  for (const candidate of candidates) {
    const { data: userData } = await admin.auth.admin.getUserById(candidate.user_id);
    if (userData?.user && (userData.user.email ?? "").toLowerCase() === email) {
      redirect(`/seguimiento/${candidate.id}`);
    }
  }

  return { error: "El código y el email no coinciden con ningún pedido." };
}
