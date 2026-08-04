// Next.js parchea el `fetch` global y, según la versión/configuración, puede
// cachear GETs sin tener en cuenta el header Authorization — lo que hace que
// una consulta de un usuario (ej. auth.getUser(), SELECT sobre profiles)
// pueda devolver la respuesta cacheada de OTRO usuario que pegó a la misma
// URL antes. Es un problema conocido al usar @supabase/ssr con el App
// Router. Se fuerza cache: "no-store" en todas las llamadas del cliente de
// Supabase para que cada request se resuelva siempre en vivo.
export function noStoreFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, { ...init, cache: "no-store" });
}
