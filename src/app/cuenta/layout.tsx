import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/actions";
import { CartProvider } from "@/lib/cart/CartContext";
import { Logo } from "@/components/storefront/Logo";

const NAV_ITEMS = [
  { href: "/cuenta", label: "Resumen" },
  { href: "/cuenta/pedidos", label: "Mis pedidos" },
  { href: "/cuenta/direcciones", label: "Direcciones" },
  { href: "/cuenta/puntos", label: "Puntos" },
  { href: "/cuenta/datos", label: "Mis datos" },
];

export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/login");

  return (
    <CartProvider>
      <div className="flex min-h-full flex-col">
        <header className="border-b border-charcoal-border bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
            <Link href="/">
              <Logo iconClassName="h-7 w-7 object-contain" />
            </Link>
            <div className="flex items-center gap-4">
              <p className="text-sm text-foreground-muted">Hola, {profile.full_name}</p>
              <form action={signOut}>
                <button type="submit" className="text-sm text-foreground-muted hover:text-gold">
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        </header>
        <nav className="border-b border-charcoal-border">
          <div className="mx-auto flex max-w-4xl flex-wrap gap-1 px-6 py-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3.5 py-1.5 text-sm text-foreground-muted transition hover:bg-gold/10 hover:text-gold"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
        <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">{children}</main>
      </div>
    </CartProvider>
  );
}
