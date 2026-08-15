"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Profile } from "@/lib/auth/session";

type NavItem = { href: string; label: string; roles: Profile["role"][] };
type NavSection = { label: string; items: NavItem[] };

// Rutas que se presentan como pestañas de /admin/productos (CatalogoTabs) —
// entrar a cualquiera de ellas debe seguir resaltando "Productos" acá.
const CATALOGO_PATHS = ["/admin/productos", "/admin/departamentos", "/admin/categorias", "/admin/colecciones"];

// Agrupado por función operativa, no por tabla de la base de datos — el
// equipo piensa en "seguimiento de pedidos" o "catálogo", no en si algo es
// una fila de `departments` o de `categories`.
const NAV_SECTIONS: NavSection[] = [
  {
    label: "Seguimiento y control",
    items: [
      { href: "/admin", label: "Dashboard", roles: ["admin", "marketing", "operaciones"] },
      { href: "/admin/pedidos", label: "Pedidos", roles: ["admin", "operaciones"] },
      { href: "/admin/pedidos?grupo=en_camino", label: "App Delivery", roles: ["admin", "operaciones"] },
      { href: "/admin/configuracion/sucursales", label: "Envíos y sucursales", roles: ["admin"] },
    ],
  },
  {
    label: "Producto y categorías",
    items: [
      // Departamentos, Categorías y Colecciones dejaron de ser links propios
      // acá — viven como pestañas dentro de /admin/productos (CatalogoTabs),
      // así el menú no repite 4 entradas del mismo árbol de catálogo.
      { href: "/admin/productos", label: "Productos", roles: ["admin", "operaciones"] },
      { href: "/admin/stock", label: "Stock", roles: ["admin", "operaciones"] },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/admin/promociones", label: "Promociones", roles: ["admin", "marketing"] },
      { href: "/admin/analisis-ofertas", label: "Análisis de ofertas", roles: ["admin", "marketing"] },
      { href: "/admin/canje-de-puntos", label: "Canje de puntos", roles: ["admin", "marketing"] },
      { href: "/admin/resenas", label: "Reseñas", roles: ["admin", "marketing"] },
      { href: "/admin/configuracion/banners", label: "Banners", roles: ["admin", "marketing"] },
    ],
  },
  {
    label: "Clientes",
    items: [{ href: "/admin/clientes", label: "Clientes", roles: ["admin", "marketing"] }],
  },
  {
    label: "Configuración",
    items: [
      { href: "/admin/configuracion/usuarios", label: "Usuarios", roles: ["admin"] },
      { href: "/admin/configuracion/sistema", label: "Ajustes del sistema", roles: ["admin"] },
      { href: "/admin/auditoria", label: "Auditoría", roles: ["admin"] },
    ],
  },
];

export function AdminNav({ role }: { role: Profile["role"] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentGroup = searchParams.get("grupo");

  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {NAV_SECTIONS.map((section) => {
        const visible = section.items.filter((item) => item.roles.includes(role));
        if (visible.length === 0) return null;
        return (
          <div key={section.label}>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-foreground-muted/70">
              {section.label}
            </p>
            <div className="mt-1.5 space-y-0.5">
              {visible.map((item) => {
                const [itemPath, itemQuery] = item.href.split("?");
                const itemGroup = itemQuery ? new URLSearchParams(itemQuery).get("grupo") : null;
                const isActive = itemGroup
                  ? pathname === itemPath && currentGroup === itemGroup
                  : itemPath === "/admin/productos"
                    ? CATALOGO_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
                    : pathname === itemPath && (itemPath !== "/admin/pedidos" || !currentGroup);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-md border-l-2 px-3 py-2 text-sm transition ${
                      isActive
                        ? "border-gold bg-gold/10 font-medium text-gold shadow-[0_0_12px_rgba(212,175,55,0.15)]"
                        : "border-transparent text-foreground-muted hover:bg-white/[0.03] hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
