"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export type TrackingState = { error: string } | null;

// Búsqueda pública de pedido (sin sesión) — el "código" que ve el cliente en
// /checkout/resultado es solo el prefijo del UUID (id.slice(0,8)), así que acá
// se buscan candidatos por prefijo y se exige que el email de auth.users
// coincida antes de redirigir. El email hace de segundo factor: nadie puede
// ver un pedido ajeno solo por adivinar/probar prefijos cortos.
export async function lookupOrder(_prev: TrackingState, formData: FormData): Promise<TrackingState> {
  const codeRaw = String(formData.get("code") ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9-]/g, "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!codeRaw || !email) {
    return { error: "Ingresá el código de pedido y el email de la compra." };
  }

  const admin = createAdminClient();
  const { data: candidates, error: queryError } = await admin
    .from("orders")
    .select("id, user_id")
    .filter("id::text", "ilike", `${codeRaw}%`)
    .limit(5);

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
