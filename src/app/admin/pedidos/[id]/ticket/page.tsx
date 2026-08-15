import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { formatCLP } from "@/lib/format";
import { STATUS_LABELS, type OrderStatus } from "@/lib/orders/status";
import { TicketPrintController } from "./TicketPrintController";

type OrderItemOption = { option_group_name_snapshot: string; option_value_name_snapshot: string };
type OrderItem = {
  id: string;
  product_name_snapshot: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  customization_note: string | null;
  order_item_options: OrderItemOption[];
};

// Comanda de armado de pedido — pensada para que el equipo de preparación
// (no el cliente ni el sistema fiscal) sepa exactamente qué armar. Se abre
// en una pestaña nueva desde la tabla de Pedidos y se imprime directo desde
// el navegador, sin pasar por ningún proveedor de boletas fiscales.
export default async function OrderTicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auto?: string }>;
}) {
  await requireRole(["admin", "operaciones"], "/admin-login");
  const { id } = await params;
  const { auto } = await searchParams;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, status, delivery_method, total, created_at, sla_deadline, scheduled_at, ticket_printed_at, user_id, address_id, store:stores(name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();

  const [{ data: customer }, { data: items }, { data: address }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone").eq("id", order.user_id).maybeSingle(),
    supabase
      .from("order_items")
      .select("id, product_name_snapshot, quantity, unit_price, subtotal, customization_note, order_item_options(option_group_name_snapshot, option_value_name_snapshot)")
      .eq("order_id", id),
    order.address_id
      ? supabase.from("addresses").select("calle, numero, comuna, ciudad").eq("id", order.address_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const store = Array.isArray(order.store) ? order.store[0] : order.store;
  const orderItems = (items ?? []) as unknown as OrderItem[];

  return (
    <div className="mx-auto max-w-sm bg-white p-6 text-ink print:p-0">
      <TicketPrintController orderId={order.id} alreadyPrinted={Boolean(order.ticket_printed_at)} autoPrint={auto === "1"} />

      <div className="text-center">
        <p className="text-lg font-bold">Pan de Rey</p>
        {store?.name && <p className="text-xs">{store.name}</p>}
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide">Comanda de preparación</p>
        <p className="text-[10px] text-ink/60">Documento no fiscal — sin validez tributaria</p>
      </div>

      <div className="mt-3 border-t border-dashed border-ink/30 pt-2 text-xs">
        <p>
          <span className="font-semibold">Pedido:</span> #{order.id.slice(0, 8)}
        </p>
        <p>
          <span className="font-semibold">Fecha del pedido:</span> {new Date(order.created_at).toLocaleString("es-CL")}
        </p>
        <p>
          <span className="font-semibold">Estado:</span> {STATUS_LABELS[order.status as OrderStatus] ?? order.status}
        </p>
        <p>
          <span className="font-semibold">Entrega:</span> {order.delivery_method === "pickup" ? "Retiro en tienda" : "Envío a domicilio"}
        </p>
        {order.scheduled_at && (
          <p>
            <span className="font-semibold">Cliente pidió recibirlo:</span>{" "}
            {new Date(order.scheduled_at).toLocaleString("es-CL")}
          </p>
        )}
        {order.sla_deadline && (
          <p>
            <span className="font-semibold">
              {order.ticket_printed_at ? "Preparar antes de:" : "Hora comprometida:"}
            </span>{" "}
            {new Date(order.sla_deadline).toLocaleTimeString("es-CL")}
          </p>
        )}
      </div>

      <div className="mt-3 border-t border-dashed border-ink/30 pt-2 text-xs">
        <p className="font-semibold">Cliente</p>
        <p>{customer?.full_name ?? "—"}</p>
        {customer?.phone && <p>{customer.phone}</p>}
        {order.delivery_method === "shipping" && address && (
          <p className="mt-1">
            {address.calle} {address.numero}, {address.comuna}, {address.ciudad}
          </p>
        )}
      </div>

      <div className="mt-3 border-t border-dashed border-ink/30 pt-2">
        <p className="text-xs font-semibold">Productos</p>
        <table className="mt-1.5 w-full text-xs">
          <tbody>
            {orderItems.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="py-1 pr-2 font-semibold">{item.quantity}×</td>
                <td className="py-1">
                  <p>{item.product_name_snapshot}</p>
                  {item.order_item_options?.map((opt, i) => (
                    <p key={i} className="text-[10px] text-ink/60">
                      {opt.option_group_name_snapshot}: {opt.option_value_name_snapshot}
                    </p>
                  ))}
                  {item.customization_note && (
                    <p className="text-[10px] italic text-ink/60">Nota: {item.customization_note}</p>
                  )}
                </td>
              </tr>
            ))}
            {orderItems.length === 0 && (
              <tr>
                <td className="py-1 text-ink/60">Sin ítems.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex justify-between border-t border-dashed border-ink/30 pt-2 text-sm font-semibold">
        <span>Total</span>
        <span>{formatCLP(order.total)}</span>
      </div>

      <p className="mt-4 text-center text-[10px] text-ink/50">Documento interno de preparación — no reemplaza boleta o factura.</p>
    </div>
  );
}
