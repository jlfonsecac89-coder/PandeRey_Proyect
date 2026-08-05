import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/auth/session";

// Único punto de escritura de audit_log (sección 15 del blueprint) — la
// tabla no tiene policy de INSERT para ningún rol de cliente, así que
// siempre se escribe con el cliente admin. `before`/`after` deben ser solo
// los campos relevantes al cambio, nunca la fila completa (evita loguear de
// más campos que no hacen al evento auditado).
export async function logAction(params: {
  actor: Pick<Profile, "id" | "role">;
  action: string;
  entityType: string;
  entityId: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}) {
  const supabase = createAdminClient();
  await supabase.from("audit_log").insert({
    actor_id: params.actor.id,
    actor_role: params.actor.role,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    before_data: params.before ?? null,
    after_data: params.after ?? null,
  });
}
