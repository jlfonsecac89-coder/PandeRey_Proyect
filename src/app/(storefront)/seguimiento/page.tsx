import { AuthCard } from "@/components/auth/AuthCard";
import { TrackingForm } from "@/components/storefront/TrackingForm";

export default function SeguimientoBusquedaPage() {
  return (
    <AuthCard
      title="Seguí tu pedido"
      subtitle="Ingresá el código que te enviamos por email junto con el correo de la compra."
    >
      <TrackingForm />
    </AuthCard>
  );
}
