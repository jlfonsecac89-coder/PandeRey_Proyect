import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatOrderNumber } from "@/lib/format";

// Asigna el N° correlativo al confirmarse el pago. Idempotente: si el pedido
// ya tiene número lo devuelve sin consumir otro (el webhook de Mercado Pago y
// la vuelta del cliente a /checkout/resultado pueden confirmar el mismo pago).
// Va con el cliente admin porque la función de base de datos solo está
// concedida a service_role.
export async function assignOrderNumber(orderId: string): Promise<number | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("assign_order_number", { p_order_id: orderId });
  if (error || data == null) return null;
  return Number(data);
}

// Texto "PDR-000123" listo para correos y mensajes; con el cliente admin
// porque se llama también desde el webhook, que no tiene sesión.
export async function getOrderLabel(orderId: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin.from("orders").select("order_number").eq("id", orderId).maybeSingle();
  return formatOrderNumber(data?.order_number, orderId);
}
