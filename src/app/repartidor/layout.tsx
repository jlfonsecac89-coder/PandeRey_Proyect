import { requireRole } from "@/lib/auth/rbac";
import { signOut } from "@/lib/auth/actions";

export default async function RepartidorLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["repartidor"]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-charcoal-border px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold-dark">
            Pan de Rey — Repartidor
          </p>
          <p className="text-sm text-foreground/60">{profile.full_name}</p>
        </div>
        <form action={signOut}>
          <button type="submit" className="text-sm text-foreground/60 hover:text-gold">
            Cerrar sesión
          </button>
        </form>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
