export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-gold-dark">
        Pan de Rey
      </p>
      <h1 className="text-3xl sm:text-4xl font-semibold text-gold">
        Panadería Artesanal Premium
      </h1>
      <p className="max-w-md text-sm text-foreground/70">
        Plataforma en construcción — ver{" "}
        <code className="text-gold-hover">BLUEPRINT.md</code> para el plan
        completo.
      </p>
    </main>
  );
}
