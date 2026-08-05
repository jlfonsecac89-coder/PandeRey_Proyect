import * as Sentry from "@sentry/nextjs";

// Instrumentación del lado del cliente (sección 03 del blueprint) — corre
// antes de la hidratación de React, captura errores no manejados del
// navegador. Sin NEXT_PUBLIC_SENTRY_DSN configurado, no se inicializa nada
// (evita mandar eventos vacíos en entornos sin Sentry configurado, ej. dev
// local de otro colaborador).
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
