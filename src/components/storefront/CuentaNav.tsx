"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/cuenta", label: "Resumen" },
  { href: "/cuenta/pedidos", label: "Mis pedidos" },
  { href: "/cuenta/direcciones", label: "Direcciones" },
  { href: "/cuenta/puntos", label: "Puntos" },
  { href: "/cuenta/datos", label: "Mis datos" },
];

export function CuentaNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-charcoal-border bg-background-elevated/60">
      <div className="mx-auto flex max-w-4xl flex-wrap gap-1 px-6 py-2">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/cuenta" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                active ? "bg-gold/15 text-gold-dark font-medium" : "text-foreground-muted hover:bg-gold/10 hover:text-gold"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
