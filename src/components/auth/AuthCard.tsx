import Link from "next/link";
import { Logo } from "@/components/storefront/Logo";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex-1 flex items-center justify-center overflow-hidden px-6 py-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(50% 45% at 50% 0%, color-mix(in srgb, var(--color-gold) 14%, transparent), transparent 70%)",
        }}
      />
      <div className="relative w-full max-w-sm">
        <Link href="/" className="mb-6 flex justify-center">
          <Logo />
        </Link>
        <h1 className="text-center font-display text-2xl font-medium text-foreground mb-1">{title}</h1>
        {subtitle && (
          <p className="text-center text-sm text-foreground-muted mb-6">{subtitle}</p>
        )}
        <div className="mt-6 rounded-2xl border border-charcoal-border bg-background-elevated p-6 shadow-card">
          {children}
        </div>
      </div>
    </main>
  );
}

export function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return (
    <p
      role="status"
      className={`mb-4 rounded-md px-3 py-2 text-sm ${
        error
          ? "bg-burgundy/10 text-burgundy-hover border border-burgundy/25"
          : "bg-gold/10 text-gold-hover border border-gold/20"
      }`}
    >
      {error ?? success}
    </p>
  );
}
