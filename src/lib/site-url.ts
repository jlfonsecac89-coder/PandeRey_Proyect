import "server-only";
import { headers } from "next/headers";

// Deriva el origin desde los headers de la request en vez de confiar
// únicamente en NEXT_PUBLIC_SITE_URL — si esa variable queda mal
// configurada (o ausente) en el entorno de despliegue, el login con Google,
// la confirmación de email y el link de vuelta de Mercado Pago apuntan a
// un dominio equivocado (o directo revientan con "Invalid URL" en signUp,
// que arma la URL con `new URL()`). Vercel setea x-forwarded-host/
// x-forwarded-proto de forma confiable en cada request, así que ese es el
// origin real del sitio para ese request específico. El env var queda como
// último fallback (build-time / contextos sin headers).
export async function getSiteUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    // x-forwarded-proto no llega en dev local (no hay proxy) — sin este
    // caso especial, el fallback a "https" rompería los links de
    // confirmación en localhost.
    const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
    const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
