import { AuthCard } from "@/components/auth/AuthCard";
import { ActualizarForm } from "./ActualizarForm";

export default function ActualizarPasswordPage() {
  return (
    <AuthCard title="Elegí tu nueva contraseña">
      <ActualizarForm />
    </AuthCard>
  );
}
