"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit/limiter";
import { staffUsernameToEmail } from "./staff-email";
import type { ActionState } from "./actions";

export async function adminSignIn(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");

  if (!username || !password) return { error: "Completa usuario y contraseña." };

  const ip = await getClientIp();
  const { allowed } = await checkRateLimit("admin-login", `${ip}:${username.toLowerCase()}`, 5, 15 * 60);
  if (!allowed) {
    return { error: "Demasiados intentos. Esperá unos minutos antes de volver a intentar." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: staffUsernameToEmail(username),
    password,
  });

  if (error || !data.user) return { error: "Usuario o contraseña incorrectos." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, must_change_password")
    .eq("id", data.user.id)
    .single();

  // Una cuenta de cliente jamás debería poder tener un email @staff...
  // pero si por algún motivo (o prueba manual) igual pasa, no se le da
  // acceso al panel — se cierra la sesión que se acaba de abrir.
  if (!profile || profile.role === "customer") {
    await supabase.auth.signOut();
    return { error: "Esta cuenta no tiene acceso al panel." };
  }

  if (profile.must_change_password) redirect("/auth/cambiar-password");
  if (profile.role === "repartidor") redirect("/repartidor");
  redirect("/admin");
}
