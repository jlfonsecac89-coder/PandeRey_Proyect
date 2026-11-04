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
      eyebrow={next === "/checkout" ? "Paso 1 de 5 — Checkout" : undefined}
      title="Crear cuenta"
      subtitle={next === "/checkout" ? "Crea tu cuenta para continuar tu compra" : "Súmate a Pan de Rey"}
    >
      <RegistroForm next={next} />
      <p className="mt-6 text-center text-sm text-foreground/60">
        ¿Ya tienes cuenta?{" "}
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
