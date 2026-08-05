import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { noStoreFetch } from "./fetch";

const STAFF_PREFIXES = ["/admin"];
const REPARTIDOR_PREFIX = "/repartidor";
const CUSTOMER_PREFIXES = ["/cuenta", "/checkout", "/pedido"];
const CHANGE_PASSWORD_PATH = "/auth/cambiar-password";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: noStoreFetch },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: no quitar este getUser() ni moverlo después de la lógica de
  // abajo — es lo que refresca el token de sesión en cada request.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isStaffRoute = STAFF_PREFIXES.some((p) => path.startsWith(p));
  const isRepartidorRoute = path.startsWith(REPARTIDOR_PREFIX);
  const isCustomerRoute = CUSTOMER_PREFIXES.some((p) => path.startsWith(p));

  if (!isStaffRoute && !isRepartidorRoute && !isCustomerRoute) {
    return supabaseResponse;
  }

  if (!user) {
    const redirectUrl = new URL("/auth/login", request.url);
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  // Rutas protegidas: sí necesitamos saber role/must_change_password (sección 09/10).
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, must_change_password")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const staffRoles = ["admin", "marketing", "operaciones"];
  if (isStaffRoute && !staffRoles.includes(profile.role)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (isRepartidorRoute && profile.role !== "repartidor") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Criterio de aceptación de la Fase 2: staff con must_change_password=true
  // DEBE ser redirigido a cambiar su contraseña antes de ver cualquier otra
  // pantalla de /admin o /repartidor.
  if (
    profile.must_change_password &&
    (isStaffRoute || isRepartidorRoute) &&
    path !== CHANGE_PASSWORD_PATH
  ) {
    return NextResponse.redirect(new URL(CHANGE_PASSWORD_PATH, request.url));
  }

  return supabaseResponse;
}
