import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/actions";

export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/login");

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-charcoal-border px-6 py-4">
        <p className="text-sm text-foreground/60">Hola, {profile.full_name}</p>
        <form action={signOut}>
          <button type="submit" className="text-sm text-foreground/60 hover:text-gold">
            Cerrar sesión
          </button>
        </form>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
