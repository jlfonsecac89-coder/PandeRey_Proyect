import Link from "next/link";

// Barra de filtros como chips horizontales — reemplaza el sidebar vertical
// de links (TiendaSidebarLayout). Sigue siendo Server Component puro: cada
// chip es un <Link> a la misma URL con searchParams de siempre (SSR,
// compartible, sin JS de filtrado del lado cliente) — solo cambia el layout
// visual, no el mecanismo de filtrado real.

type PriceBucket = { key: string; label: string; min: number; max: number | null };
type Category = { id: string; name: string; slug: string };

function Chip({
  href,
  active,
  danger,
  children,
}: {
  href: string;
  active: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium transition-all duration-200 ${
        active
          ? danger
            ? "border-burgundy bg-burgundy text-foreground"
            : "border-gold bg-gold text-ink shadow-[0_4px_16px_rgba(212,175,55,0.22)]"
          : "border-crust-soft bg-masa text-foreground-muted hover:border-gold-dark hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

export function TiendaFilterBar({
  currentDept,
  categoriesInDept,
  categoria,
  precio,
  singluten,
  filtro,
  activeFilterCount,
  buildHref,
}: {
  currentDept: { id: string; name: string; slug: string } | null | undefined;
  categoriesInDept: Category[];
  categoria?: string;
  precio?: string;
  singluten?: string;
  filtro?: string;
  activeFilterCount: number;
  buildHref: (overrides: Record<string, string | undefined>) => string;
}) {
  const PRICE_BUCKETS: PriceBucket[] = [
    { key: "0-1500", label: "Hasta $1.500", min: 0, max: 1500 },
    { key: "1500-3000", label: "$1.500 – $3.000", min: 1500, max: 3000 },
    { key: "3000-10000", label: "$3.000 – $10.000", min: 3000, max: 10000 },
    { key: "10000-", label: "Más de $10.000", min: 10000, max: null },
  ];

  return (
    <div className="sticky top-[57px] z-30 -mx-6 mt-6 border-y border-crust-soft bg-background/95 px-6 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        {currentDept && categoriesInDept.length > 0 && (
          <>
            <Chip href={buildHref({ categoria: undefined })} active={!categoria}>
              Todas las categorías
            </Chip>
            {categoriesInDept.map((c) => (
              <Chip key={c.id} href={buildHref({ categoria: c.slug })} active={categoria === c.slug}>
                {c.name}
              </Chip>
            ))}
            <span className="mx-1 h-4 w-px shrink-0 bg-crust-soft" aria-hidden="true" />
          </>
        )}

        {PRICE_BUCKETS.map((b) => (
          <Chip key={b.key} href={buildHref({ precio: precio === b.key ? undefined : b.key })} active={precio === b.key}>
            {b.label}
          </Chip>
        ))}

        <span className="mx-1 h-4 w-px shrink-0 bg-crust-soft" aria-hidden="true" />

        <Chip
          href={buildHref({ filtro: filtro === "ofertas" ? undefined : "ofertas" })}
          active={filtro === "ofertas"}
          danger
        >
          Ofertas
        </Chip>
        <Chip href={buildHref({ filtro: filtro === "evento" ? undefined : "evento" })} active={filtro === "evento"}>
          Edición limitada
        </Chip>
        <Chip href={buildHref({ singluten: singluten === "1" ? undefined : "1" })} active={singluten === "1"}>
          Sin gluten
        </Chip>

        {activeFilterCount > 0 && (
          <Link
            href="/tienda"
            className="ml-auto shrink-0 whitespace-nowrap text-xs text-gold-hover hover:underline"
          >
            Limpiar filtros
          </Link>
        )}
      </div>
    </div>
  );
}
