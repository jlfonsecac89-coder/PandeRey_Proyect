import { AuthCard } from "@/components/auth/AuthCard";
import { ActualizarForm } from "./ActualizarForm";

export default function ActualizarPasswordPage() {
  return (
    <AuthCard title="Elige tu nueva contraseña">
      <ActualizarForm />
    </AuthCard>
  );
}
