import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { RepartidorForm } from "./RepartidorForm";

export default async function RepartidoresPage() {
  await requireRole(["admin"]);

  const supabase = await createClient();
  const { data: stores } = await supabase
    .from("stores")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  return (
    <div>
      <h1 className="text-xl font-semibold text-gold">Repartidores</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Alta rápida de repartidores, sin pasar por Configuración → Usuarios. La contraseña
        temporal se muestra una sola vez — el repartidor debe cambiarla en su primer ingreso.
      </p>
      <div className="mt-6">
        <RepartidorForm stores={stores ?? []} />
      </div>
    </div>
  );
}
