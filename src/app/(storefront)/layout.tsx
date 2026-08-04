import Link from "next/link";
import { CartProvider } from "@/lib/cart/CartContext";
import { CartBadgeLink } from "@/components/storefront/CartBadgeLink";
import { getCurrentProfile } from "@/lib/auth/session";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  return (
    <CartProvider>
      <div className="flex min-h-full flex-col">
        <header className="flex items-center justify-between border-b border-charcoal-border px-6 py-4">
          <Link href="/" className="text-sm uppercase tracking-[0.2em] text-gold-dark">
            Pan de Rey
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/tienda"
              className="rounded-md px-3 py-1.5 text-sm text-foreground/60 hover:bg-charcoal-border hover:text-gold"
            >
              Tienda
            </Link>
            <Link
              href={profile ? "/cuenta" : "/auth/login"}
              className="rounded-md px-3 py-1.5 text-sm text-foreground/60 hover:bg-charcoal-border hover:text-gold"
            >
              {profile ? "Mi cuenta" : "Iniciar sesión"}
            </Link>
            <CartBadgeLink />
          </nav>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </CartProvider>
  );
}
