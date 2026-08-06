import "server-only";
import { redirect } from "next/navigation";
import { getCurrentProfile, type Profile } from "./session";

// Capa 2 de la sección 10 del blueprint: cada Server Action/layout staff-only
// debe volver a verificar el rol acá — nunca confiar en que el middleware
// (Capa 1) ya filtró correctamente. Repite también el gate de
// must_change_password (criterio de aceptación de la Fase 2) como defensa
// en profundidad, no solo dependiendo del middleware.
//
// `loginPath` existe para /admin: ese módulo tiene su propio login interno
// por usuario (/admin-login, no debe cruzarse con el login de clientes) —
// todo lo demás sigue cayendo a /auth/login.
export async function requireRole(
  allowed: Profile["role"][],
  loginPath: string = "/auth/login",
): Promise<Profile> {
  const profile = await getCurrentProfile();

  if (!profile) redirect(loginPath);
  if (!allowed.includes(profile.role)) redirect("/");
  if (profile.must_change_password) redirect("/auth/cambiar-password");

  return profile;
}
