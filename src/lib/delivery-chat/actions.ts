"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";
import { logAction } from "@/lib/audit/log-action";
import type { DeliveryMessage, SendMessageState } from "./types";

// Chat de incidencia repartidor↔tienda (paso 9 del blueprint admin-redesign)
// — mismo criterio de RBAC que el resto del portal repartidor: requireRole
// como primera línea (Capa 1), la RLS de order_delivery_messages (sección
// 4 del blueprint) es la Capa 2, nunca la única barrera.

// Mensaje que son solo 6 dígitos = posible código de entrega filtrado por
// error del lado del repartidor o del cliente — medida defensiva, no
// reemplaza la protección real (delivery_confirmation_code nunca se envía
// por acá, solo se ingresa en el formulario de confirmación de entrega).
const SIX_DIGIT_CODE = /^\d{6}$/;

export async function sendDeliveryMessage(orderId: string, message: string): Promise<SendMessageState> {
  const profile = await requireRole(["repartidor", "admin", "operaciones"]);

  const trimmed = message.trim();
  if (!trimmed) return { error: "Escribí un mensaje antes de enviar." };
  if (trimmed.length > 500) return { error: "El mensaje es demasiado largo (máximo 500 caracteres)." };
  if (SIX_DIGIT_CODE.test(trimmed)) {
    return { error: "No envíes el código de entrega por el chat — pedile al cliente que te lo diga y usalo en el formulario de confirmación." };
  }

  const supabase = await createClient();

  // Defensa en profundidad (Capa 1) — la RLS ya restringe esto (Capa 2),
  // pero nunca se confía solo en RLS: se valida acá también la pertenencia
  // real antes de intentar el insert, para devolver un error claro en vez
  // de un insert silenciosamente rechazado por policy.
  const { data: order } = await supabase
    .from("orders")
    .select("id, assigned_driver_id, store_id")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return { error: "Pedido no encontrado." };

  const senderRole: "repartidor" | "tienda" = profile.role === "repartidor" ? "repartidor" : "tienda";

  if (senderRole === "repartidor" && order.assigned_driver_id !== profile.id) {
    return { error: "Este pedido no está asignado a vos." };
  }
  if (senderRole === "tienda" && profile.role === "operaciones" && order.store_id !== profile.store_id) {
    return { error: "Este pedido no pertenece a tu sucursal." };
  }

  try {
    const { data: created, error } = await supabase
      .from("order_delivery_messages")
      .insert({
        order_id: orderId,
        sender_role: senderRole,
        sender_id: profile.id,
        message: trimmed,
      })
      .select("id, order_id, sender_role, sender_id, message, created_at")
      .single();

    if (error || !created) return { error: "No se pudo enviar el mensaje." };

    if (senderRole === "tienda") {
      await logAction({
        actor: profile,
        action: "delivery_message_sent",
        entityType: "order",
        entityId: orderId,
        after: { message: trimmed },
      });
    }

    revalidatePath("/repartidor");
    revalidatePath("/admin/pedidos");
    return { success: "Mensaje enviado.", message: created as DeliveryMessage };
  } catch (err) {
    console.error("sendDeliveryMessage failed", err);
    return { error: "Ocurrió un error al enviar el mensaje. Intentá de nuevo." };
  }
}

export async function listDeliveryMessages(orderId: string): Promise<DeliveryMessage[]> {
  await requireRole(["repartidor", "admin", "operaciones"]);
  const supabase = await createClient();

  // Sin chequeo manual de pertenencia acá: la RLS de order_delivery_messages
  // ya devuelve 0 filas si el pedido no es del repartidor/sucursal — es el
  // comportamiento correcto para una lectura (a diferencia del insert, que
  // necesita un error explícito en vez de un fallo silencioso).
  const { data } = await supabase
    .from("order_delivery_messages")
    .select("id, order_id, sender_role, sender_id, message, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  return (data ?? []) as DeliveryMessage[];
}
