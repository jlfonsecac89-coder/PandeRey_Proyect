import "server-only";
import { redirect } from "next/navigation";
import { getCurrentProfile, type Profile } from "./session";

// Capa 2 de la sección 10 del blueprint: cada Server Action/layout staff-only
// debe volver a verificar el rol acá — nunca confiar en que el middleware
// (Capa 1) ya filtró correctamente. Repite también el gate de
// must_change_password (criterio de aceptación de la Fase 2) como defensa
// en profundidad, no solo dependiendo del middleware.
export async function requireRole(allowed: Profile["role"][]): Promise<Profile> {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/auth/login");
  if (!allowed.includes(profile.role)) redirect("/");
  if (profile.must_change_password) redirect("/auth/cambiar-password");

  return profile;
}
