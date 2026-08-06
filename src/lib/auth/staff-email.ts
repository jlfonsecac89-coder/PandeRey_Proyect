// El panel interno (admin/marketing/operaciones/repartidor) se identifica
// por usuario, no por email — para no cruzarse con /auth/login, que es la
// puerta de entrada de clientes. Supabase Auth igual necesita un email por
// abajo, así que el "usuario" se mapea a un email interno con este dominio
// reservado; nunca se muestra en ninguna pantalla del panel (solo se ve
// full_name), así que para el staff es, en la práctica, un login por
// usuario y contraseña.
//
// Vive en su propio archivo (sin "use server") porque un módulo "use server"
// solo puede exportar funciones async — esta es una función pura sync.
const STAFF_EMAIL_DOMAIN = "staff.panderey.internal";

export function staffUsernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${STAFF_EMAIL_DOMAIN}`;
}
