import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { RegistroForm } from "./RegistroForm";

export default function RegistroPage() {
  return (
    <AuthCard title="Crear cuenta" subtitle="Sumate a Pan de Rey">
      <RegistroForm />
      <p className="mt-6 text-center text-sm text-foreground/60">
        ¿Ya tenés cuenta?{" "}
        <Link href="/auth/login" className="text-gold hover:text-gold-hover">
          Iniciar sesión
        </Link>
      </p>
    </AuthCard>
  );
}
