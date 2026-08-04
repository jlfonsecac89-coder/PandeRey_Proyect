import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-gold-dark">
        Pan de Rey
      </p>
      <h1 className="text-3xl sm:text-4xl font-semibold text-gold">
        Panadería Artesanal Premium
      </h1>
      <p className="max-w-md text-sm text-foreground/70">
        Pan, pastelería y café artesanal — pedí online con retiro en tienda o
        despacho a domicilio.
      </p>
      <Link
        href="/tienda"
        className="mt-2 rounded-md bg-gold px-5 py-2 text-sm font-semibold text-background hover:bg-gold-hover"
      >
        Ver la tienda
      </Link>
    </div>
  );
}
