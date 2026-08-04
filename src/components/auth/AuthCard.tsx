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
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-gold-dark mb-2">
          Pan de Rey
        </p>
        <h1 className="text-center text-2xl font-semibold text-gold mb-1">{title}</h1>
        {subtitle && (
          <p className="text-center text-sm text-foreground/60 mb-6">{subtitle}</p>
        )}
        <div className="mt-6 rounded-lg border border-charcoal-border bg-charcoal-light p-6">
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
          ? "bg-red-500/10 text-red-400 border border-red-500/20"
          : "bg-gold/10 text-gold-hover border border-gold/20"
      }`}
    >
      {error ?? success}
    </p>
  );
}
