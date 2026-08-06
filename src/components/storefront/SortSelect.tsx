"use client";

import { useRouter } from "next/navigation";

export function SortSelect({
  current,
  options,
  currentParams,
}: {
  current: string;
  options: { key: string; label: string }[];
  currentParams: Record<string, string | undefined>;
}) {
  const router = useRouter();

  const buildHref = (orden: string) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(currentParams)) {
      if (value) params.set(key, value);
    }
    if (orden) params.set("orden", orden);
    const qs = params.toString();
    return qs ? `/tienda?${qs}` : "/tienda";
  };

  return (
    <label className="flex items-center gap-2 text-xs text-foreground-muted">
      Ordenar por
      <select
        value={current}
        onChange={(e) => router.push(buildHref(e.target.value))}
        className="rounded-md border border-charcoal-border bg-background-elevated px-2 py-1.5 text-sm text-foreground outline-none focus:border-gold-dark"
      >
        {options.map((opt) => (
          <option key={opt.key} value={opt.key}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
