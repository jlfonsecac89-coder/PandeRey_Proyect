import { getCurrentProfile } from "@/lib/auth/session";

export default async function AdminHomePage() {
  const profile = await getCurrentProfile();

  return (
    <div>
      <h1 className="text-xl font-semibold text-gold">Panel de administración</h1>
      <p className="mt-2 text-sm text-foreground/60">
        Bienvenido, {profile?.full_name}. Los módulos completos (pedidos, productos,
        performance, etc.) se construyen en las próximas fases — ver BLUEPRINT.md sección
        17.
      </p>
    </div>
  );
}
