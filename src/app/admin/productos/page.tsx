import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { ProductoForm } from "./ProductoForm";
import { ProductosTable } from "@/components/admin/ProductosTable";

export default async function ProductosPage() {
  await requireRole(["admin", "operaciones"], "/admin-login");

  const supabase = await createClient();
  const [{ data: products }, { data: categories }, { data: collections }, { data: departments }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, sku, price, is_active, is_special_event, category:categories(id, name, department:departments(id, name))",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("categories")
      .select("id, name, department:departments(name)")
      .order("name"),
    supabase.from("collections").select("id, name").order("name"),
    supabase.from("departments").select("id, name").eq("is_active", true).order("sort_order"),
  ]);

  type ProductRow = {
    id: string;
    name: string;
    sku: string;
    price: number;
    is_active: boolean;
    is_special_event: boolean;
    category: { id: string; name: string; department: { id: string; name: string } | { id: string; name: string }[] | null } | { id: string; name: string; department: { id: string; name: string } | { id: string; name: string }[] | null }[] | null;
  };

  const normalized = ((products ?? []) as ProductRow[]).map((p) => {
    const cat = Array.isArray(p.category) ? p.category[0] : p.category;
    const dept = cat ? (Array.isArray(cat.department) ? cat.department[0] : cat.department) : null;
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: p.price,
      is_active: p.is_active,
      is_special_event: p.is_special_event,
      categoryId: cat?.id ?? null,
      categoryName: cat?.name ?? null,
      departmentId: dept?.id ?? null,
      departmentName: dept?.name ?? null,
    };
  });

  const total = normalized.length;
  const activos = normalized.filter((p) => p.is_active).length;
  const inactivos = total - activos;
  const edicionLimitada = normalized.filter((p) => p.is_special_event).length;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Producto y categorías</p>
        <div className="mt-1 flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-medium text-foreground">Productos</h1>
            <p className="mt-1 text-sm text-foreground-muted">
              El SKU se genera automáticamente — nunca se escribe a mano.
            </p>
          </div>
          <Link
            href="/admin/productos/importar"
            className="rounded-md border border-charcoal-border px-3 py-1.5 text-sm text-foreground-muted transition hover:border-gold-dark hover:text-gold"
          >
            Carga masiva
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-charcoal-border bg-background-elevated p-5 shadow-card">
          <p className="text-xs uppercase tracking-wide text-foreground-muted">Total</p>
          <p className="mt-1.5 font-display text-2xl font-medium text-foreground">{total}</p>
        </div>
        <div className="rounded-xl border border-charcoal-border bg-background-elevated p-5 shadow-card">
          <p className="text-xs uppercase tracking-wide text-foreground-muted">Activos</p>
          <p className="mt-1.5 font-display text-2xl font-medium text-gold">{activos}</p>
        </div>
        <div className="rounded-xl border border-charcoal-border bg-background-elevated p-5 shadow-card">
          <p className="text-xs uppercase tracking-wide text-foreground-muted">Inactivos</p>
          <p className="mt-1.5 font-display text-2xl font-medium text-foreground">{inactivos}</p>
        </div>
        <div className="rounded-xl border border-charcoal-border bg-background-elevated p-5 shadow-card">
          <p className="text-xs uppercase tracking-wide text-foreground-muted">Edición limitada</p>
          <p className="mt-1.5 font-display text-2xl font-medium text-foreground">{edicionLimitada}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-charcoal-border bg-background-elevated p-5 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Nuevo producto</p>
        <div className="mt-3">
          <ProductoForm categories={categories ?? []} collections={collections ?? []} />
        </div>
      </div>

      <ProductosTable products={normalized} departments={departments ?? []} />
    </div>
  );
}
