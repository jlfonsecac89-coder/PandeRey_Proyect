"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { Profile } from "@/lib/auth/session";
import { AdminNavGroup } from "./AdminNavGroup";

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
      { href: "/admin/configuracion/repartidores", label: "Repartidores", roles: ["admin"] },
      { href: "/admin/configuracion/sistema", label: "Ajustes del sistema", roles: ["admin"] },
      { href: "/admin/auditoria", label: "Auditoría", roles: ["admin"] },
    ],
  },
];

// Solo este grupo arranca expandido — reúne Dashboard + seguimiento de
// pedidos, lo que el equipo revisa primero al entrar. El resto arranca
// colapsado y se abre solo o al hacer click en su header (sección 9, paso 1
// del blueprint admin-redesign).
const DEFAULT_OPEN_SECTION = "Seguimiento y control";

function isItemActive(item: NavItem, pathname: string, currentGroup: string | null): boolean {
  const [itemPath, itemQuery] = item.href.split("?");
  const itemGroup = itemQuery ? new URLSearchParams(itemQuery).get("grupo") : null;
  if (itemGroup) return pathname === itemPath && currentGroup === itemGroup;
  if (itemPath === "/admin/productos") {
    return CATALOGO_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  }
  return pathname === itemPath && (itemPath !== "/admin/pedidos" || !currentGroup);
}

export function AdminNav({ role }: { role: Profile["role"] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentGroup = searchParams.get("grupo");

  const activeSection = NAV_SECTIONS.find((section) =>
    section.items.some((item) => isItemActive(item, pathname, currentGroup)),
  )?.label;

  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set([DEFAULT_OPEN_SECTION, ...(activeSection ? [activeSection] : [])]),
  );
  const [lastAutoExpanded, setLastAutoExpanded] = useState(activeSection);

  // Si la navegación cambia a una ruta que vive en un grupo colapsado,
  // expandirlo automáticamente — sin esto, moverse por links internos
  // (ej. "Ver stock →" de una alerta) deja el item activo escondido.
  // setState durante el render (no en un efecto) siguiendo el patrón de
  // React para "ajustar estado cuando cambia una prop" — evita el error de
  // react-hooks/set-state-in-effect y el re-render extra de un efecto.
  if (activeSection && activeSection !== lastAutoExpanded) {
    setLastAutoExpanded(activeSection);
    setOpenSections((prev) => (prev.has(activeSection) ? prev : new Set(prev).add(activeSection)));
  }

  function toggleSection(label: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
      {NAV_SECTIONS.map((section) => {
        const visible = section.items.filter((item) => item.roles.includes(role));
        if (visible.length === 0) return null;
        return (
          <AdminNavGroup
            key={section.label}
            title={section.label}
            isOpen={openSections.has(section.label)}
            onToggle={() => toggleSection(section.label)}
          >
            {visible.map((item) => {
              const isActive = isItemActive(item, pathname, currentGroup);
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
          </AdminNavGroup>
        );
      })}
    </nav>
  );
}
