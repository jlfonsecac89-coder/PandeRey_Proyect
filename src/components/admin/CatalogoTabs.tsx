import Link from "next/link";
import type { Profile } from "@/lib/auth/session";

const TABS: { href: string; label: string; roles: Profile["role"][] }[] = [
  { href: "/admin/departamentos", label: "Departamentos", roles: ["admin"] },
  { href: "/admin/categorias", label: "Categorías", roles: ["admin"] },
  { href: "/admin/colecciones", label: "Colecciones", roles: ["admin", "marketing"] },
];

// Departamentos, Categorías y Colecciones son los 3 niveles del mismo árbol
// de catálogo — viven en rutas separadas (cada una con su propia query y
// formulario) pero se presentan como pestañas de una sola sección para que
// el equipo no las viva como 3 pantallas desconectadas.
export function CatalogoTabs({ active, role }: { active: "departamentos" | "categorias" | "colecciones"; role: Profile["role"] }) {
  const visible = TABS.filter((t) => t.roles.includes(role));

  return (
    <div className="flex gap-1 border-b border-charcoal-border">
      {visible.map((tab) => {
        const isActive = tab.href.endsWith(active);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`border-b-2 px-4 py-2.5 text-sm transition ${
              isActive
                ? "border-gold text-gold"
                : "border-transparent text-foreground-muted hover:text-gold"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
