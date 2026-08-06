"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toggleProductActive } from "@/lib/catalog/actions";
import { formatCLP } from "@/lib/format";

type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  is_active: boolean;
  is_special_event: boolean;
  categoryId: string | null;
  categoryName: string | null;
  departmentId: string | null;
  departmentName: string | null;
};

export function ProductosTable({
  products,
  departments,
}: {
  products: Product[];
  departments: { id: string; name: string }[];
}) {
  const [search, setSearch] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [estado, setEstado] = useState<"todos" | "activo" | "inactivo">("todos");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (departamento && p.departmentId !== departamento) return false;
      if (estado === "activo" && !p.is_active) return false;
      if (estado === "inactivo" && p.is_active) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [products, departamento, estado, search]);

  async function handleToggle(p: Product) {
    setPendingId(p.id);
    await toggleProductActive(p.id, !p.is_active);
    setPendingId(null);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o SKU..."
          className="w-56 rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm outline-none focus:border-gold"
        />
        <select
          value={departamento}
          onChange={(e) => setDepartamento(e.target.value)}
          className="rounded-md border border-charcoal-border bg-background px-2 py-1.5 text-sm outline-none focus:border-gold"
        >
          <option value="">Todos los departamentos</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <div className="flex gap-1">
          {(["todos", "activo", "inactivo"] as const).map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEstado(e)}
              className={`rounded-full border px-3 py-1 text-xs capitalize transition ${
                estado === e
                  ? "border-gold-dark text-gold-hover"
                  : "border-charcoal-border text-foreground-muted hover:text-gold"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
        <p className="ml-auto text-xs text-foreground-muted">
          {filtered.length} producto{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-charcoal-border bg-background-elevated shadow-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-charcoal-border text-xs uppercase tracking-wide text-foreground-muted">
              <th className="px-4 py-3 font-normal">SKU</th>
              <th className="px-4 py-3 font-normal">Nombre</th>
              <th className="px-4 py-3 font-normal">Departamento</th>
              <th className="px-4 py-3 font-normal">Categoría</th>
              <th className="px-4 py-3 font-normal">Precio</th>
              <th className="px-4 py-3 font-normal">Estado</th>
              <th className="px-4 py-3 font-normal">Editar</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-charcoal-border/50 last:border-0">
                <td className="px-4 py-2.5 font-mono text-xs text-gold-dark">{p.sku}</td>
                <td className="px-4 py-2.5 text-foreground">{p.name}</td>
                <td className="px-4 py-2.5 text-foreground-muted">{p.departmentName ?? "—"}</td>
                <td className="px-4 py-2.5 text-foreground-muted">{p.categoryName ?? "—"}</td>
                <td className="px-4 py-2.5 text-foreground-muted">{formatCLP(p.price)}</td>
                <td className="px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => handleToggle(p)}
                    disabled={pendingId === p.id}
                    className={`rounded-full border px-2.5 py-0.5 text-xs transition disabled:opacity-50 ${
                      p.is_active ? "border-gold text-gold" : "border-charcoal-border text-foreground-muted"
                    }`}
                  >
                    {p.is_active ? "Activo" : "Inactivo"}
                  </button>
                </td>
                <td className="px-4 py-2.5">
                  <Link href={`/admin/productos/${p.id}`} className="text-xs text-gold-hover hover:underline">
                    Editar →
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-foreground-muted">
                  No hay productos que coincidan con estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
