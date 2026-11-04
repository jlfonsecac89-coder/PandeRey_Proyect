import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Cabeceras que se aplican a toda la tienda y el admin. No se define un
// Content-Security-Policy con script-src: Next inyecta scripts en línea y,
// sin nonces, una política estricta rompería el sitio. Aquí van solo las
// directivas que no pueden romperlo (nadie debería poder enmarcar la tienda
// ni el panel, ni cargar <object>/<base> ajenos).
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
];

const nextConfig: NextConfig = {
  // No muestra "X-Powered-By: Next.js": no hay por qué anunciar el framework.
  poweredByHeader: false,
  // La app no usa next/image (las fotos de producto se sirven directo desde
  // Supabase Storage), así que el optimizador /_next/image se apaga: varias de
  // las vulnerabilidades críticas de Next.js viven en ese endpoint.
  images: { unoptimized: true },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

// Sin SENTRY_AUTH_TOKEN (requiere una cuenta de Sentry con permisos de CI/CD,
// no solo el DSN) no hay upload de source maps ni org/project asociados —
// se deshabilita explícitamente esa parte en vez de dejar que falle en
// silencio o intente pegarle a la API de Sentry sin credenciales.
export default withSentryConfig(nextConfig, {
  silent: true,
  sourcemaps: { disable: true },
});
