"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/rbac";
import { logAction } from "@/lib/audit/log-action";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit/limiter";

// Versión vigente de los Términos y Condiciones — cambiarla obliga a los
// clientes nuevos a aceptar la versión nueva; no reescribe lo ya aceptado
// (terms_acceptances es histórico, sección 11 del blueprint).
const TERMS_VERSION = "2026-08-04-v1";

export type ActionState = { error?: string; success?: string } | null;

function validatePassword(password: string): string | null {
  if (password.length < 10) {
    return "La contraseña debe tener al menos 10 caracteres.";
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "La contraseña debe incluir al menos una letra y un número.";
  }
  return null;
}

export async function signUp(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const acceptedTerms = formData.get("accept_terms") === "on";

  if (!fullName || !email || !password) {
    return { error: "Completa todos los campos." };
  }
  if (!acceptedTerms) {
    return { error: "Debes aceptar los Términos y Condiciones para registrarte." };
  }
  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError };

  // Sección 16: 10 intentos/hora por IP.
  const ip = await getClientIp();
  const { allowed } = await checkRateLimit("registro", ip, 10, 60 * 60);
  if (!allowed) {
    return { error: "Demasiados intentos de registro. Probá de nuevo más tarde." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) return { error: error.message };
  if (!data.user) return { error: "No se pudo crear la cuenta. Intenta de nuevo." };

  await supabase.from("terms_acceptances").insert({
    user_id: data.user.id,
    terms_version: TERMS_VERSION,
  });

  redirect("/auth/verificar-email");
}

export async function signIn(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "");

  if (!email || !password) return { error: "Completa todos los campos." };

  // Sección 16: 5 intentos/15min por IP+email combinados — se rechaza ANTES
  // de llamar a Supabase Auth, para no gastar esa validación en fuerza
  // bruta. El mensaje es genérico a propósito: no revela si el email existe.
  const ip = await getClientIp();
  const { allowed } = await checkRateLimit("login", `${ip}:${email}`, 5, 15 * 60);
  if (!allowed) {
    return { error: "Demasiados intentos. Esperá unos minutos antes de volver a intentar." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) return { error: "Email o contraseña incorrectos." };

  if (next) redirect(next);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, must_change_password")
    .eq("id", data.user.id)
    .single();

  if (profile?.must_change_password) redirect("/auth/cambiar-password");
  if (profile?.role === "repartidor") redirect("/repartidor");
  if (profile?.role && profile.role !== "customer") redirect("/admin");
  redirect("/");
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  });

  if (error || !data.url) redirect("/auth/login?error=google");
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

export async function requestPasswordReset(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) return { error: "Ingresa tu email." };

  // Sección 16: 3 intentos/hora por email — igual devolvemos el mismo
  // mensaje genérico de siempre, para no revelar por otra vía que se
  // alcanzó el límite (que también delataría si el email existe).
  const { allowed } = await checkRateLimit("recuperar-password", email, 3, 60 * 60);
  if (!allowed) {
    return {
      success:
        "Si el email existe en nuestro sistema, vas a recibir un link para recuperar tu contraseña.",
    };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/actualizar-password`,
  });

  // Nunca revelamos si el email existe o no (mismo principio anti-enumeración
  // del rate limit de login, sección 16) — siempre el mismo mensaje.
  return {
    success:
      "Si el email existe en nuestro sistema, vas a recibir un link para recuperar tu contraseña.",
  };
}

export async function updatePassword(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const password = String(formData.get("password") || "");
  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  redirect("/auth/login");
}

export async function changePasswordFirstLogin(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const password = String(formData.get("password") || "");
  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  // Se usa el cliente admin (service_role) para este update puntual porque el
  // trigger protect_profile_columns bloquea que un usuario no-admin cambie
  // must_change_password sobre su propia fila (es la misma protección que evita
  // que un cliente se auto-edite campos sensibles) — este flujo es justamente
  // el mecanismo de sistema diseñado para limpiar el flag tras el cambio.
  const admin = createAdminClient();
  const { error: profileError } = await admin
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id);

  if (profileError) {
    return { error: "No se pudo actualizar el perfil. Intenta de nuevo." };
  }

  redirect("/admin");
}

const STAFF_ALLOWED_ROLES = ["marketing", "operaciones", "repartidor"] as const;

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pwd = "";
  for (let i = 0; i < 12; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd;
}

export async function createStaffUser(
  _prevState: (ActionState & { tempPassword?: string }) | null,
  formData: FormData,
): Promise<ActionState & { tempPassword?: string }> {
  const actor = await requireRole(["admin"]);

  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "");
  const storeId = String(formData.get("store_id") || "") || null;

  if (!fullName || !email || !role) {
    return { error: "Completa todos los campos." };
  }

  // Allowlist server-side sin excepción (sección 08/10): jamás se crea una
  // cuenta con role='admin' desde la app, aunque se manipule el formulario.
  if (!STAFF_ALLOWED_ROLES.includes(role as (typeof STAFF_ALLOWED_ROLES)[number])) {
    return { error: "Rol inválido." };
  }
  if ((role === "operaciones" || role === "repartidor") && !storeId) {
    return { error: "Operaciones y Repartidor deben tener una sucursal asignada." };
  }

  const tempPassword = generateTempPassword();
  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created.user) {
    return { error: createError?.message ?? "No se pudo crear la cuenta." };
  }

  // handle_new_user (trigger) ya creó la fila en profiles con role='customer';
  // acá la corregimos al rol real y forzamos el cambio de contraseña.
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      full_name: fullName,
      role,
      store_id: storeId,
      must_change_password: true,
    })
    .eq("id", created.user.id);

  if (updateError) {
    return {
      error: "La cuenta se creó pero no se pudo configurar el rol. Contacta a soporte.",
    };
  }

  // Sección 15: creación de cuentas de staff es una de las acciones
  // sensibles que siempre queda en audit_log — nunca se registra la
  // contraseña temporal, solo qué cuenta se creó y con qué rol.
  await logAction({
    actor,
    action: "staff_account_created",
    entityType: "profile",
    entityId: created.user.id,
    after: { email, role, store_id: storeId },
  });

  revalidatePath("/admin/configuracion/usuarios");
  return { success: `Cuenta creada para ${email}.`, tempPassword };
}
