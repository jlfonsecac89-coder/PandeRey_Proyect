"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Package, MapPin, Gift, LayoutGrid, LogOut, ChevronRight } from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { formatCLP } from "@/lib/format";
import { Seal } from "@/components/storefront/Seal";

const NAV_ITEMS = [
  { href: "/cuenta", label: "Resumen", Icon: LayoutGrid },
  { href: "/cuenta/pedidos", label: "Mis pedidos", Icon: Package },
  { href: "/cuenta/direcciones", label: "Direcciones", Icon: MapPin },
  { href: "/cuenta/puntos", label: "Puntos", Icon: Gift },
  { href: "/cuenta/datos", label: "Mis datos", Icon: User },
];

export function CuentaSidebar({
  fullName,
  pointsBalance,
  pointsValueClp,
}: {
  fullName: string;
  pointsBalance: number;
  pointsValueClp: number;
}) {
  const pathname = usePathname();

  return (
    <aside className="lg:w-72 lg:shrink-0">
      <div className="rounded-2xl border border-crust-soft bg-masa p-5 backdrop-blur-sm lg:sticky lg:top-24">
        {/* Tarjeta del club — muestra solo datos reales: el saldo de puntos y
            lo que valen en pesos según la tasa configurada. No hay niveles
            (Oro/Plata/etc.) porque el sistema todavía no tiene ese concepto. */}
        <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-[#1C1610] to-[#0A0A0A] p-5 shadow-xl">
          <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-ember/10 blur-xl" />

          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-gold">Pan de Rey Club</p>
              <h2 className="mt-1 font-display text-lg text-foreground">{fullName}</h2>
            </div>
            <Seal size="sm" />
          </div>

          <div className="relative mt-6">
            <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-foreground-muted">
              Puntos acumulados
            </p>
            <p className="font-display text-3xl font-black text-foreground">
              {pointsBalance}{" "}
              <span className="font-sans text-xs font-bold uppercase tracking-widest text-gold">pts</span>
            </p>
          </div>

          <div className="relative mt-4 border-t border-white/5 pt-4">
            <p className="text-[10px] text-foreground-muted">
              Equivalen a <span className="font-semibold text-gold">{formatCLP(pointsValueClp)}</span> de descuento
              en tu próxima compra.
            </p>
          </div>
        </div>

        <nav className="mt-6 space-y-1.5">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = href === "/cuenta" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex w-full items-center justify-between rounded-xl p-3.5 text-[11px] font-bold uppercase tracking-widest transition-all ${
                  active
                    ? "bg-white/10 text-foreground shadow-lg"
                    : "text-foreground-muted hover:bg-white/5 hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${active ? "text-gold" : "text-foreground-muted/70"}`} />
                  {label}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-foreground-muted/40" />
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-white/5 pt-4">
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl p-3.5 text-[11px] font-bold uppercase tracking-widest text-burgundy-hover transition-colors hover:bg-burgundy/10"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
