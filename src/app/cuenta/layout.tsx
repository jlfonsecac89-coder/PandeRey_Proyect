import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/actions";
import { CartProvider } from "@/lib/cart/CartContext";

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
        <header className="flex items-center justify-between border-b border-charcoal-border px-6 py-4">
          <p className="text-sm text-foreground/60">Hola, {profile.full_name}</p>
          <form action={signOut}>
            <button type="submit" className="text-sm text-foreground/60 hover:text-gold">
              Cerrar sesión
            </button>
          </form>
        </header>
        <nav className="flex flex-wrap gap-1 border-b border-charcoal-border px-6 py-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm text-foreground/60 hover:bg-charcoal-border hover:text-gold"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </CartProvider>
  );
}
