import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";

export default function VerificarEmailPage() {
  return (
    <AuthCard title="Revisá tu correo">
      <p className="text-center text-sm text-foreground/70">
        Te enviamos un link de confirmación. Hacé clic en él para activar tu
        cuenta — vas a poder ingresar apenas lo confirmes.
      </p>
      <p className="mt-6 text-center text-sm">
        <Link href="/auth/login" className="text-gold hover:text-gold-hover">
          Volver a iniciar sesión
        </Link>
      </p>
    </AuthCard>
  );
}
