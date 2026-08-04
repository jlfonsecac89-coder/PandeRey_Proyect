import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { RecuperarForm } from "./RecuperarForm";

export default function RecuperarPasswordPage() {
  return (
    <AuthCard title="Recuperar contraseña" subtitle="Te mandamos un link para restablecerla">
      <RecuperarForm />
      <p className="mt-6 text-center text-sm">
        <Link href="/auth/login" className="text-gold hover:text-gold-hover">
          Volver a iniciar sesión
        </Link>
      </p>
    </AuthCard>
  );
}
