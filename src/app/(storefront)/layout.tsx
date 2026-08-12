import Link from "next/link";
import { CartProvider } from "@/lib/cart/CartContext";
import { CartBadgeLink } from "@/components/storefront/CartBadgeLink";
import { CartDrawer } from "@/components/storefront/CartDrawer";
import { Logo } from "@/components/storefront/Logo";
import { StorefrontFooter } from "@/components/storefront/StorefrontFooter";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const [profile, { data: store }] = await Promise.all([
    getCurrentProfile(),
    supabase
      .from("stores")
      .select("name, contact_address, contact_phone, contact_email, social_links")
      .eq("is_active", true)
      .order("name")
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <CartProvider>
      <div className="flex min-h-full flex-col">
        <header className="sticky top-0 z-40 border-b border-charcoal-border bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2.5">
            <Link href="/" className="text-foreground hover:text-gold">
              <Logo iconClassName="h-14 w-14" />
            </Link>
            <nav className="flex items-center gap-1">
              <Link
                href="/"
                className="rounded-md px-3 py-1.5 text-sm text-foreground-muted transition hover:text-gold"
              >
                Inicio
              </Link>
              <Link
                href="/tienda"
                className="rounded-md px-3 py-1.5 text-sm text-foreground-muted transition hover:text-gold"
              >
                Tienda
              </Link>
              <Link
                href="/seguimiento"
                className="rounded-md px-3 py-1.5 text-sm text-foreground-muted transition hover:text-gold"
              >
                Seguimiento
              </Link>
              <Link
                href={profile ? "/cuenta" : "/auth/login"}
                className="rounded-md px-3 py-1.5 text-sm text-foreground-muted transition hover:text-gold"
              >
                {profile ? "Mi cuenta" : "Iniciar sesión"}
              </Link>
              <CartBadgeLink />
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <StorefrontFooter
          storeName={store?.name}
          contactAddress={store?.contact_address}
          contactPhone={store?.contact_phone}
          contactEmail={store?.contact_email}
          socialLinks={store?.social_links}
        />
      </div>
      <CartDrawer />
    </CartProvider>
  );
}
