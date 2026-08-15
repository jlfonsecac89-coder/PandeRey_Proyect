import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { CartProvider } from "@/lib/cart/CartContext";
import { Logo } from "@/components/storefront/Logo";
import { CuentaSidebar } from "@/components/storefront/CuentaSidebar";
import { loyaltyPointsToClpRate } from "@/lib/loyalty/points";

export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/login");
  const pointsRate = await loyaltyPointsToClpRate();

  return (
    <CartProvider>
      <div className="flex min-h-full flex-col">
        <header className="sticky top-0 z-40 border-b border-charcoal-border bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
            <Link href="/">
              <Logo iconClassName="h-11 w-11" />
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
            </nav>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-8 lg:flex-row">
          <CuentaSidebar
            fullName={profile.full_name}
            pointsBalance={profile.points_balance}
            pointsValueClp={profile.points_balance * pointsRate}
          />
          <main className="min-h-[500px] flex-1 rounded-2xl border border-white/10 bg-background-alt/60 p-6 backdrop-blur-sm sm:p-8">
            {children}
          </main>
        </div>
      </div>
    </CartProvider>
  );
}
