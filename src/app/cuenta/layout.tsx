import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/actions";
import { CartProvider } from "@/lib/cart/CartContext";
import { Logo } from "@/components/storefront/Logo";
import { CuentaNav } from "@/components/storefront/CuentaNav";

export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/login");

  return (
    <CartProvider>
      <div className="flex min-h-full flex-col">
        <header className="border-b border-charcoal-border bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
            <Link href="/">
              <Logo iconClassName="h-11 w-11" />
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
        <CuentaNav />
        <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">{children}</main>
      </div>
    </CartProvider>
  );
}
