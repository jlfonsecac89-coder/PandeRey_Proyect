import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { RegistroForm } from "./RegistroForm";

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <AuthCard
      eyebrow={next === "/checkout" ? "Paso 1 de 4 — Checkout" : undefined}
      title="Crear cuenta"
      subtitle={next === "/checkout" ? "Creá tu cuenta para continuar tu compra" : "Sumate a Pan de Rey"}
    >
      <RegistroForm next={next} />
      <p className="mt-6 text-center text-sm text-foreground/60">
        ¿Ya tenés cuenta?{" "}
        <Link
          href={`/auth/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="text-gold hover:text-gold-hover"
        >
          Iniciar sesión
        </Link>
      </p>
    </AuthCard>
  );
}
