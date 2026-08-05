import * as Sentry from "@sentry/nextjs";

// Sección 03/15 del blueprint: observabilidad de errores en producción — con
// pagos, webhooks (MP) y crons corriendo sin supervisión, detectar fallos
// rápido es crítico. `register()` corre una vez al levantar el server,
// tanto en runtime Node como Edge (sección 04, Proxy/Middleware de esta
// versión de Next.js).
export async function register() {
  if (!process.env.SENTRY_DSN) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    // Sin SENTRY_AUTH_TOKEN configurado no hay upload de source maps
    // (ver next.config.ts) — los stack traces igual llegan, solo minificados.
  });
}

export const onRequestError = Sentry.captureRequestError;
