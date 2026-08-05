"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Next.js solo usa este boundary para errores en el layout raíz mismo (algo
// muy raro) — reemplaza <html>/<body> por completo, así que no puede
// depender de ningún otro componente de la app. Sección 15: cualquier
// fallo no manejado se reporta a Sentry antes de mostrarle algo al usuario.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          background: "#0a0a0a",
          color: "#f5f5f4",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Ocurrió un error inesperado</h1>
        <p style={{ fontSize: "0.875rem", color: "#a3a3a3", maxWidth: "28rem" }}>
          Ya quedó registrado. Probá recargar la página o volvé más tarde.
        </p>
      </body>
    </html>
  );
}
