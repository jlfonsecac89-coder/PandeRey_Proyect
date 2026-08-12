"use server";

import * as Sentry from "@sentry/nextjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/rbac";
import { logAction } from "@/lib/audit/log-action";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit/limiter";
import { TERMS_VERSION } from "@/lib/legal/terms";
import { encryptFieldForStorage } from "@/lib/crypto/encrypt-field";
import { isValidRut, cleanRut } from "@/lib/rut";
import { getSiteUrl } from "@/lib/site-url";

export type ActionState = { error?: string; success?: string } | null;

// Supabase Auth devuelve sus errores en inglés y con jerga técnica ("email
// rate limit exceeded", "User already registered"). Mostrárselos tal cual a
// un cliente no le dice qué hacer, así que se traducen a algo accionable.
// El de rate limit de email es el más importante: no es culpa del cliente
// sino del proveedor de correo del sitio, y sin este mensaje parece que el
// formulario está roto sin motivo.
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("email rate limit") || m.includes("rate limit exceeded")) {
    return "No pudimos enviarte el email de confirmación en este momento. Volvé a intentar en unos minutos o escribinos para activar tu cuenta.";
  }
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "Ya existe una cuenta con ese email. Probá iniciar sesión o recuperar tu contraseña.";
  }
  if (m.includes("invalid login credentials")) {
    return "Email o contraseña incorrectos.";
  }
  if (m.includes("email not confirmed")) {
    return "Tenés que confirmar tu email antes de iniciar sesión. Revisá tu bandeja de entrada y el correo no deseado.";
  }
  if (m.includes("password should be") || m.includes("weak password")) {
    return "La contraseña es demasiado débil. Usá al menos 10 caracteres, con letras y números.";
  }
  if (m.includes("error sending") || m.includes("smtp") || m.includes("could not send email")) {
    return "No pudimos enviar el email en este momento. Intentá de nuevo en unos minutos.";
  }
  // Supabase a veces devuelve errores sin texto útil para el usuario (ej.
  // AuthRetryableFetchError con cuerpo "{}" cuando el proveedor SMTP
  // rechaza el envío) — mostrar eso tal cual confunde más que ayuda.
  if (!message.trim() || message.trim() === "{}") {
    return "Ocurrió un error inesperado. Intentá de nuevo en unos minutos.";
  }
  return message;
}

// `next` viaja en un campo de formulario (o querystring) que en teoría
// cualquiera puede manipular — sin este chequeo, un link armado con
// next=https://sitio-malicioso.cl redirigiría ahí tras un login/registro
// legítimo (open redirect). Solo se acepta una ruta relativa propia.
function safeNextPath(next: string): string | null {
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

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
  const rutRaw = String(formData.get("rut") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const gender = String(formData.get("gender") || "").trim() || null;
  const birthDate = String(formData.get("birth_date") || "").trim() || null;
  const next = String(formData.get("next") || "").trim();

  if (!fullName || !email || !password) {
    return { error: "Completa todos los campos." };
  }
  if (!acceptedTerms) {
    return { error: "Debes aceptar los Términos y Condiciones para registrarte." };
  }
  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError };
  // RUT es opcional, pero si se ingresa tiene que ser válido — nunca se
  // confía en la validación del cliente (sección 04 del blueprint).
  if (rutRaw && !isValidRut(rutRaw)) {
    return { error: "El RUT ingresado no es válido." };
  }

  // Sección 16: 10 intentos/hora por IP.
  const ip = await getClientIp();
  const { allowed } = await checkRateLimit("registro", ip, 10, 60 * 60);
  if (!allowed) {
    return { error: "Demasiados intentos de registro. Probá de nuevo más tarde." };
  }

  const safeNext = safeNextPath(next);
  const siteUrl = await getSiteUrl();
  // El link de confirmación de registro, igual que el de recuperación de
  // contraseña, entrega el token en el fragmento de la URL — no puede pasar
  // por /auth/callback (ruta de servidor, nunca ve el fragmento). Se
  // resuelve del lado del cliente en /auth/confirmar.
  const confirmUrl = new URL(`${siteUrl}/auth/confirmar`);
  if (safeNext) confirmUrl.searchParams.set("next", safeNext);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: confirmUrl.toString(),
    },
  });

  if (error) return { error: friendlyAuthError(error.message) };
  if (!data.user) return { error: "No se pudo crear la cuenta. Intenta de nuevo." };

  // rut_encrypted está en la lista de columnas protegidas de
  // protect_profile_columns (igual que role/is_active) — un cliente no
  // puede tocarlo con su propia sesión ni siquiera en su propia fila, así
  // que este set inicial se hace con el cliente admin, mismo patrón que
  // changePasswordFirstLogin. phone/gender/birth_date sí podrían ir con la
  // sesión del usuario, pero se agrupan en la misma llamada para no
  // depender de dos escrituras separadas justo después de crear la cuenta.
  const admin = createAdminClient();
  if (rutRaw || phone || gender || birthDate) {
    await admin
      .from("profiles")
      .update({
        rut_encrypted: rutRaw ? encryptFieldForStorage(cleanRut(rutRaw)) : null,
        phone,
        gender,
        birth_date: birthDate,
      })
      .eq("id", data.user.id);
  }

  // Con la confirmación de email activada, signUp NO devuelve sesión — la
  // sesión del usuario todavía no existe, así que este insert hecho con
  // `supabase` (anon + RLS) era rechazado y fallaba en silencio: la tabla
  // quedaba vacía aunque el cliente sí hubiera aceptado los términos. Como
  // es un registro con valor legal (sección 11: hay que poder demostrar qué
  // versión aceptó y cuándo), se escribe con el cliente admin y se verifica
  // el error en vez de descartarlo.
  const { error: termsError } = await admin.from("terms_acceptances").insert({
    user_id: data.user.id,
    terms_version: TERMS_VERSION,
  });
  if (termsError) {
    Sentry.captureException(termsError, {
      extra: { context: "terms_acceptances_insert", userId: data.user.id },
    });
  }

  // Si el proyecto tiene desactivada la confirmación por email, signUp
  // devuelve sesión activa y mandar al cliente a "revisá tu correo" lo deja
  // esperando un email que nunca va a llegar.
  if (data.session) {
    redirect(safeNext ?? "/");
  }
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

  // "Email sin confirmar" se distingue a propósito de "credenciales
  // incorrectas": si se devuelve el mensaje genérico, el cliente cree que
  // erró la contraseña y la reintenta para siempre sin enterarse nunca de
  // que solo le falta confirmar el correo. El resto de los errores sí
  // quedan con el mensaje genérico (no revelar si el email existe).
  if (error?.message?.toLowerCase().includes("email not confirmed")) {
    return { error: friendlyAuthError(error.message) };
  }
  if (error || !data.user) return { error: "Email o contraseña incorrectos." };

  const safeNext = safeNextPath(next);
  if (safeNext) redirect(safeNext);

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

export async function signInWithGoogle(formData: FormData) {
  const next = String(formData.get("next") || "");
  const safeNext = safeNextPath(next);

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const callbackUrl = new URL(`${siteUrl}/auth/callback`);
  if (safeNext) callbackUrl.searchParams.set("next", safeNext);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl.toString() },
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
  const siteUrl = await getSiteUrl();
  // El link de recuperación de Supabase entrega el token en el fragmento de
  // la URL (#access_token=...&type=recovery), no como "?code=" — por eso NO
  // puede pasar por /auth/callback (ruta de servidor: nunca ve el fragmento,
  // solo el navegador lo lee). ActualizarForm.tsx es quien establece la
  // sesión leyendo ese hash del lado del cliente.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/actualizar-password`,
  });

  // Al cliente se le sigue mostrando siempre el mismo mensaje (para no
  // revelar si el email existe), pero antes el error se descartaba por
  // completo: si el envío fallaba —por ejemplo por el límite de correos del
  // proveedor— no quedaba rastro en ningún lado y desde afuera parecía que
  // el mail simplemente no llegaba nunca.
  if (error) {
    Sentry.captureException(error, { extra: { context: "resetPasswordForEmail" } });
  }

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
