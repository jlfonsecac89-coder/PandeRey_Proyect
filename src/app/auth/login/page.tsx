import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const fromCheckout = params.next === "/checkout";

  return (
    <AuthCard
      eyebrow={fromCheckout ? "Paso 1 de 5 — Checkout" : undefined}
      title="Iniciar sesión"
      subtitle={fromCheckout ? "Iniciá sesión o creá una cuenta para continuar tu compra" : "Accedé a tu cuenta de Pan de Rey"}
    >
      <LoginForm next={params.next} oauthError={params.error} />
      <p className="mt-6 text-center text-sm text-foreground/60">
        ¿No tenés cuenta?{" "}
        <Link
          href={`/auth/registro${params.next ? `?next=${encodeURIComponent(params.next)}` : ""}`}
          className="text-gold hover:text-gold-hover"
        >
          Registrate{fromCheckout ? " — es rápido" : ""}
        </Link>
      </p>
      <p className="mt-2 text-center text-sm">
        <Link href="/auth/recuperar-password" className="text-gold-dark hover:text-gold-hover">
          Olvidé mi contraseña
        </Link>
      </p>
    </AuthCard>
  );
}
