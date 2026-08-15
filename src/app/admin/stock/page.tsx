import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { formatCLP } from "@/lib/format";

function dateNDaysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// Supabase infiere las relaciones anidadas como array (no puede saber la
// cardinalidad real desde el string de la query) aunque acá siempre sea
// una sola fila — se desenvuelve una vez acá en lugar de repetir el
// Array.isArray(...) ? [0] : ... en cada nivel.
function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function StockPage() {
  await requireRole(["admin", "operaciones"], "/admin-login");
  const supabase = await createClient();

  const [{ data: storeProducts }, { data: batches }] = await Promise.all([
    supabase
      .from("store_products")
      .select(
        "stock_quantity, is_available_here, store:stores(name), product:products(id, name, sku, price, is_active, category:categories(name, department:departments(name)))",
      ),
    supabase
      .from("product_batches")
      .select("id, quantity, expiration_date, store:stores(name), product:products(name)")
      .gt("quantity", 0)
      .not("expiration_date", "is", null)
      .lte("expiration_date", dateNDaysFromNow(Number(process.env.CLEARANCE_ALERT_DAYS_BEFORE_EXPIRY ?? 3)))
      .order("expiration_date", { ascending: true }),
  ]);

  type Row = {
    stock_quantity: number;
    is_available_here: boolean;
    store: { name: string } | { name: string }[] | null;
    product:
      | {
          id: string;
          name: string;
          sku: string;
          price: number;
          is_active: boolean;
          category: { name: string; department: { name: string } | { name: string }[] | null } | { name: string; department: { name: string } | { name: string }[] | null }[] | null;
        }
      | null;
  };

  const rows = ((storeProducts ?? []) as unknown as Row[])
    .filter((r) => unwrap(r.product)?.is_active)
    .map((r) => {
      const store = unwrap(r.store);
      const product = unwrap(r.product)!;
      const cat = unwrap(product.category);
      const dept = cat ? unwrap(cat.department) : null;
      return {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        storeName: store?.name ?? "—",
        departmentName: dept?.name ?? "—",
        quantity: r.stock_quantity,
      };
    })
    .sort((a, b) => a.quantity - b.quantity);

  const totalProducts = rows.length;
  const sinStock = rows.filter((r) => r.quantity === 0).length;
  const valorTotal = rows.reduce((sum, r) => sum + r.quantity * r.price, 0);

  type BatchRow = {
    id: string;
    quantity: number;
    expiration_date: string;
    store: { name: string } | { name: string }[] | null;
    product: { name: string } | { name: string }[] | null;
  };
  const expiringList = (batches as BatchRow[] | null) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Seguimiento y control</p>
        <h1 className="mt-1 font-display text-2xl font-medium text-foreground">Stock</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
          <p className="text-xs uppercase tracking-wide text-foreground-muted">Productos con seguimiento</p>
          <p className="mt-1.5 font-display text-2xl font-medium text-foreground">{totalProducts}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
          <p className="text-xs uppercase tracking-wide text-foreground-muted">Sin stock</p>
          <p className="mt-1.5 font-display text-2xl font-medium text-burgundy-hover">{sinStock}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
          <p className="text-xs uppercase tracking-wide text-foreground-muted">Lotes por vencer</p>
          <p className="mt-1.5 font-display text-2xl font-medium text-gold">{expiringList.length}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-card">
          <p className="text-xs uppercase tracking-wide text-foreground-muted">Valor en stock</p>
          <p className="mt-1.5 font-display text-2xl font-medium text-foreground">{formatCLP(valorTotal)}</p>
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
          Lotes próximos a vencer
        </h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] shadow-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-charcoal-border text-xs uppercase tracking-wide text-foreground-muted">
                <th className="px-4 py-3 font-normal">Producto</th>
                <th className="px-4 py-3 font-normal">Sucursal</th>
                <th className="px-4 py-3 font-normal">Cantidad</th>
                <th className="px-4 py-3 font-normal">Vence</th>
              </tr>
            </thead>
            <tbody>
              {expiringList.map((b) => {
                const store = Array.isArray(b.store) ? b.store[0] : b.store;
                const product = Array.isArray(b.product) ? b.product[0] : b.product;
                return (
                  <tr key={b.id} className="border-b border-charcoal-border/50 last:border-0">
                    <td className="px-4 py-2.5 text-foreground">{product?.name}</td>
                    <td className="px-4 py-2.5 text-foreground-muted">{store?.name}</td>
                    <td className="px-4 py-2.5 text-foreground-muted">{b.quantity}</td>
                    <td className="px-4 py-2.5 text-gold-hover">
                      {new Date(b.expiration_date).toLocaleDateString("es-CL")}
                    </td>
                  </tr>
                );
              })}
              {expiringList.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-foreground-muted">
                    Sin lotes próximos a vencer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Stock por producto</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] shadow-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-charcoal-border text-xs uppercase tracking-wide text-foreground-muted">
                <th className="px-4 py-3 font-normal">Producto</th>
                <th className="px-4 py-3 font-normal">Departamento</th>
                <th className="px-4 py-3 font-normal">Sucursal</th>
                <th className="px-4 py-3 font-normal">Stock</th>
                <th className="px-4 py-3 font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.productId}-${i}`} className="border-b border-charcoal-border/50 last:border-0">
                  <td className="px-4 py-2.5 text-foreground">{r.name}</td>
                  <td className="px-4 py-2.5 text-foreground-muted">{r.departmentName}</td>
                  <td className="px-4 py-2.5 text-foreground-muted">{r.storeName}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs ${
                        r.quantity === 0
                          ? "border-burgundy text-burgundy-hover"
                          : r.quantity <= 5
                            ? "border-gold text-gold"
                            : "border-charcoal-border text-foreground-muted"
                      }`}
                    >
                      {r.quantity} u.
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/productos/${r.productId}`} className="text-xs text-gold-hover hover:underline">
                      Cargar lote →
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-foreground-muted">
                    Todavía no hay productos con seguimiento de stock por sucursal.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
