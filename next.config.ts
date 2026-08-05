import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

// Sin SENTRY_AUTH_TOKEN (requiere una cuenta de Sentry con permisos de CI/CD,
// no solo el DSN) no hay upload de source maps ni org/project asociados —
// se deshabilita explícitamente esa parte en vez de dejar que falle en
// silencio o intente pegarle a la API de Sentry sin credenciales.
export default withSentryConfig(nextConfig, {
  silent: true,
  sourcemaps: { disable: true },
});
