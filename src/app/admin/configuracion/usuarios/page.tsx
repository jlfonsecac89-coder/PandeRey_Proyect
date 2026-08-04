import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { UsuarioForm } from "./UsuarioForm";

export default async function UsuariosPage() {
  await requireRole(["admin"]);

  const supabase = await createClient();
  const { data: stores } = await supabase
    .from("stores")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  return (
    <div>
      <h1 className="text-xl font-semibold text-gold">Gestión de usuarios</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Crear cuentas de Marketing, Operaciones o Repartidor. La contraseña temporal
        se muestra una sola vez — el staff debe cambiarla en su primer ingreso.
      </p>
      <div className="mt-6">
        <UsuarioForm stores={stores ?? []} />
      </div>
    </div>
  );
}
