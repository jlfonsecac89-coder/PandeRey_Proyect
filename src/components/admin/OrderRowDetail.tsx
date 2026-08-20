import { formatCLP } from "@/lib/format";

// Extraído de AdminOrderRow.tsx (paso 2 del blueprint admin-redesign) —
// fila expandible con las líneas del pedido, ahora con precio por producto
// (antes solo mostraba unidades).
export type OrderItemSummary = {
  product_name_snapshot: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

export function OrderRowDetail({ items, colSpan }: { items: OrderItemSummary[]; colSpan: number }) {
  return (
    <tr className="border-b border-white/10 bg-white/[0.03]">
      <td colSpan={colSpan} className="py-2 pl-3 text-xs text-foreground/60">
        {items.map((item, i) => (
          <span key={i}>
            {item.quantity}× {item.product_name_snapshot} ({formatCLP(item.unit_price)} c/u = {formatCLP(item.subtotal)})
            {i < items.length - 1 ? " · " : ""}
          </span>
        ))}
        {items.length === 0 && "Sin ítems."}
      </td>
    </tr>
  );
}
