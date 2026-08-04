import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthCard title="Iniciar sesión" subtitle="Accedé a tu cuenta de Pan de Rey">
      <LoginForm next={params.next} oauthError={params.error} />
      <p className="mt-6 text-center text-sm text-foreground/60">
        ¿No tenés cuenta?{" "}
        <Link href="/auth/registro" className="text-gold hover:text-gold-hover">
          Registrate
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
