import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { getCurrentProfile } from "@/lib/auth/session";
import { CambiarForm } from "./CambiarForm";

// Destino obligatorio para staff con must_change_password=true (lo aplica
// middleware.ts). Esta página también verifica por su cuenta (Capa 2,
// defensa en profundidad) — si alguien la visita sin sesión, la manda a login.
export default async function CambiarPasswordPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/login");

  return (
    <AuthCard
      title="Cambiá tu contraseña"
      subtitle="Es tu primer ingreso — necesitás elegir una contraseña nueva antes de continuar"
    >
      <CambiarForm />
    </AuthCard>
  );
}
