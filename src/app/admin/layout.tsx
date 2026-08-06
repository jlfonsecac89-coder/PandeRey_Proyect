import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { signOut } from "@/lib/auth/actions";
import { Logo } from "@/components/storefront/Logo";
import type { Profile } from "@/lib/auth/session";

// Módulos visibles por rol (sección 09 del blueprint) — se ocultan por
// completo en el menú, no solo se deshabilitan; cada página además vuelve a
// verificar el rol por su cuenta (defensa en profundidad).
const NAV_ITEMS: { href: string; label: string; roles: Profile["role"][] }[] = [
  { href: "/admin", label: "Dashboard", roles: ["admin", "marketing", "operaciones"] },
  { href: "/admin/pedidos", label: "Pedidos", roles: ["admin", "operaciones"] },
  { href: "/admin/productos", label: "Productos", roles: ["admin", "operaciones"] },
  { href: "/admin/departamentos", label: "Departamentos", roles: ["admin"] },
  { href: "/admin/categorias", label: "Categorías", roles: ["admin"] },
  { href: "/admin/colecciones", label: "Colecciones", roles: ["admin", "marketing"] },
  { href: "/admin/promociones", label: "Promociones", roles: ["admin", "marketing"] },
  { href: "/admin/analisis-ofertas", label: "Análisis de ofertas", roles: ["admin", "marketing"] },
  { href: "/admin/canje-de-puntos", label: "Canje de puntos", roles: ["admin", "marketing"] },
  { href: "/admin/resenas", label: "Reseñas", roles: ["admin", "marketing"] },
  { href: "/admin/clientes", label: "Clientes", roles: ["admin", "marketing"] },
  { href: "/admin/configuracion/usuarios", label: "Usuarios", roles: ["admin"] },
  { href: "/admin/configuracion/sucursales", label: "Sucursales", roles: ["admin"] },
  { href: "/admin/configuracion/banners", label: "Banners", roles: ["admin", "marketing"] },
];

const ROLE_LABELS: Record<Profile["role"], string> = {
  admin: "Administrador",
  marketing: "Marketing",
  operaciones: "Operaciones",
  repartidor: "Repartidor",
  customer: "Cliente",
};

// Capa 2 (sección 10): vuelve a verificar el rol acá, además de lo que ya
// filtró middleware.ts (Capa 1) — nunca confiar en una sola capa.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["admin", "marketing", "operaciones"]);
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(profile.role));

  return (
    <div className="flex min-h-full">
      <aside className="flex w-60 shrink-0 flex-col border-r border-charcoal-border bg-background-elevated">
        <div className="border-b border-charcoal-border px-5 py-5">
          <Link href="/admin">
            <Logo iconClassName="h-7 w-7 object-contain" />
          </Link>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-gold-dark">Panel administrativo</p>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm text-foreground-muted transition hover:bg-gold/10 hover:text-gold"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-charcoal-border px-5 py-4">
          <p className="truncate text-sm text-foreground">{profile.full_name}</p>
          <p className="text-xs text-foreground-muted">{ROLE_LABELS[profile.role]}</p>
          <form action={signOut} className="mt-2">
            <button type="submit" className="text-xs text-foreground-muted transition hover:text-burgundy-hover">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto p-8">{children}</main>
    </div>
  );
}
