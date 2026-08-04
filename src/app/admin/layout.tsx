import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { signOut } from "@/lib/auth/actions";
import type { Profile } from "@/lib/auth/session";

// Módulos visibles por rol (sección 09 del blueprint) — se ocultan por
// completo en el menú, no solo se deshabilitan; cada página además vuelve a
// verificar el rol por su cuenta (defensa en profundidad).
const NAV_ITEMS: { href: string; label: string; roles: Profile["role"][] }[] = [
  { href: "/admin", label: "Dashboard", roles: ["admin", "marketing", "operaciones"] },
  { href: "/admin/productos", label: "Productos", roles: ["admin", "operaciones"] },
  { href: "/admin/departamentos", label: "Departamentos", roles: ["admin"] },
  { href: "/admin/categorias", label: "Categorías", roles: ["admin"] },
  { href: "/admin/colecciones", label: "Colecciones", roles: ["admin", "marketing"] },
  { href: "/admin/canje-de-puntos", label: "Canje de puntos", roles: ["admin", "marketing"] },
  { href: "/admin/configuracion/usuarios", label: "Usuarios", roles: ["admin"] },
];

// Capa 2 (sección 10): vuelve a verificar el rol acá, además de lo que ya
// filtró middleware.ts (Capa 1) — nunca confiar en una sola capa.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["admin", "marketing", "operaciones"]);
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(profile.role));

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-charcoal-border px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold-dark">
            Pan de Rey — Admin
          </p>
          <p className="text-sm text-foreground/60">
            {profile.full_name} · {profile.role}
          </p>
        </div>
        <form action={signOut}>
          <button type="submit" className="text-sm text-foreground/60 hover:text-gold">
            Cerrar sesión
          </button>
        </form>
      </header>
      <nav className="flex flex-wrap gap-1 border-b border-charcoal-border px-6 py-2">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-1.5 text-sm text-foreground/60 hover:bg-charcoal-border hover:text-gold"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
