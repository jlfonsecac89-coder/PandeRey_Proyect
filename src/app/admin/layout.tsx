import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { signOut } from "@/lib/auth/actions";
import { Logo } from "@/components/storefront/Logo";
import { AdminNav } from "@/components/admin/AdminNav";
import type { Profile } from "@/lib/auth/session";

const ROLE_LABELS: Record<Profile["role"], string> = {
  admin: "Administrador",
  marketing: "Marketing",
  operaciones: "Operaciones",
  repartidor: "Repartidor",
  customer: "Cliente",
};

// Capa 2 (sección 10): vuelve a verificar el rol acá, además de lo que ya
// filtró middleware.ts (Capa 1) — nunca confiar en una sola capa.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["admin", "marketing", "operaciones"], "/admin-login");

  return (
    <div className="flex min-h-full">
      <aside className="flex w-64 shrink-0 flex-col border-r border-charcoal-border bg-background-elevated">
        <div className="border-b border-charcoal-border px-5 py-5">
          <Link href="/admin">
            <Logo iconClassName="h-7 w-7 object-contain" />
          </Link>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-gold-dark">Panel administrativo</p>
        </div>

        <AdminNav role={profile.role} />

        <div className="border-t border-charcoal-border px-5 py-4">
          <p className="truncate text-sm text-foreground">{profile.full_name}</p>
          <p className="text-xs text-foreground-muted">{ROLE_LABELS[profile.role]}</p>
          <form action={signOut} className="mt-2">
            <button type="submit" className="text-xs text-foreground-muted transition hover:text-burgundy-hover">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto p-8">{children}</main>
    </div>
  );
}
