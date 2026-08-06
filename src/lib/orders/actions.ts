"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/rbac";
import { getCurrentProfile } from "@/lib/auth/session";
import { sendNotification, getUserEmail } from "@/lib/notifications/send";
import {
  readyForPickupTemplate,
  inRouteTemplate,
  deliveredTemplate,
  deliveryIssueTemplate,
  returnedToStoreTemplate,
  purchaseConfirmedTemplate,
} from "@/lib/notifications/templates";
import { maxDeliveryIssueWaitMinutes, orderPrepSlaMinutes } from "./status";
import { computeEarnedPoints } from "@/lib/loyalty/points";

export type OrderActionState = { error?: string; success?: string } | null;

async function insertHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderId: string,
  status: string,
  changedBy: string | null,
  note?: string,
) {
  await supabase
    .from("order_status_history")
    .insert({ order_id: orderId, status, changed_by: changedBy, note });
}

async function notifyOwner(
  orderId: string,
  userId: string,
  template: string,
  build: () => { subject: string; html: string },
) {
  const email = await getUserEmail(userId);
  if (!email) return;
  const { subject, html } = build();
  await sendNotification({ userId, orderId, to: email, template, subject, html });
}

// ---------- Operaciones/Admin: pago manual (transferencia) ----------

// A diferencia de Mercado Pago (webhook automático), un pedido pagado por
// transferencia lo confirma el equipo a mano después de ver el depósito —
// replica los mismos side-effects que confirmPayment() de Mercado Pago
// (puntos, email, sla_deadline) porque para el resto del sistema un pedido
// "paid" tiene que verse igual sin importar el medio de pago.
export async function confirmBankTransferPayment(orderId: string): Promise<OrderActionState> {
  const profile = await requireRole(["admin", "operaciones"]);
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, user_id, scheduled_at, total, delivery_confirmation_code, delivery_method, payment_method")
    .eq("id", orderId)
    .eq("status", "pending_payment")
    .maybeSingle();

  if (!order) return { error: "Pedido no encontrado o ya no está pendiente de pago." };
  if (order.payment_method !== "bank_transfer") {
    return { error: "Este pedido no es por transferencia." };
  }

  const nextStatus = order.scheduled_at ? "paid" : "preparing";
  const slaDeadline = order.scheduled_at
    ? order.scheduled_at
    : new Date(Date.now() + orderPrepSlaMinutes() * 60000).toISOString();

  const { error } = await supabase
    .from("orders")
    .update({ status: nextStatus, sla_deadline: slaDeadline })
    .eq("id", orderId)
    .eq("status", "pending_payment");
  if (error) return { error: "No se pudo confirmar el pago." };

  await insertHistory(supabase, orderId, nextStatus, profile.id, "Transferencia confirmada manualmente");
  revalidatePath("/admin/pedidos");

  const earnedPoints = computeEarnedPoints(order.total);
  if (earnedPoints > 0) {
    const admin = createAdminClient();
    await admin.from("points_ledger").insert({
      user_id: order.user_id,
      order_id: order.id,
      type: "earn_purchase",
      points: earnedPoints,
      description: `Compra pedido #${order.id.slice(0, 8)}`,
    });
  }

  await notifyOwner(orderId, order.user_id, "purchase_confirmed", () =>
    purchaseConfirmedTemplate({
      orderId: order.id,
      total: order.total,
      deliveryConfirmationCode: order.delivery_confirmation_code ?? "",
      deliveryMethod: order.delivery_method as "pickup" | "shipping",
    }),
  );

  return { success: "Pago confirmado." };
}

// ---------- Operaciones/Admin: preparación y retiro ----------

export async function markOrderReady(orderId: string): Promise<OrderActionState> {
  const profile = await requireRole(["admin", "operaciones"]);
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, delivery_method")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { error: "Pedido no encontrado." };
  if (order.status !== "preparing") {
    return { error: "El pedido no está en preparación." };
  }

  const nextStatus = order.delivery_method === "pickup" ? "ready_for_pickup" : "ready";
  const { error } = await supabase
    .from("orders")
    .update({ status: nextStatus, ready_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) return { error: "No se pudo actualizar el pedido." };

  await insertHistory(supabase, orderId, nextStatus, profile.id);
  revalidatePath("/admin/pedidos");

  if (nextStatus === "ready_for_pickup") {
    const { data: full } = await supabase.from("orders").select("user_id").eq("id", orderId).single();
    if (full) {
      await notifyOwner(orderId, full.user_id, "ready_for_pickup", () => readyForPickupTemplate(orderId));
    }
  }

  return { success: "Pedido actualizado." };
}

export async function confirmPickup(orderId: string): Promise<OrderActionState> {
  const profile = await requireRole(["admin", "operaciones"]);
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, user_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { error: "Pedido no encontrado." };
  if (order.status !== "ready_for_pickup") {
    return { error: "El pedido no está listo para retiro." };
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: "delivered", delivered_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) return { error: "No se pudo confirmar el retiro." };

  await insertHistory(supabase, orderId, "delivered", profile.id);
  revalidatePath("/admin/pedidos");
  await notifyOwner(orderId, order.user_id, "delivered", () => deliveredTemplate(orderId));

  return { success: "Retiro confirmado." };
}

export async function assignDriver(orderId: string, driverId: string): Promise<OrderActionState> {
  const profile = await requireRole(["admin", "operaciones"]);
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, delivery_method, store_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { error: "Pedido no encontrado." };
  if (order.delivery_method !== "shipping" || order.status !== "ready") {
    return { error: "El pedido no está listo para asignar repartidor." };
  }

  const { data: driver } = await supabase
    .from("profiles")
    .select("id, role, store_id")
    .eq("id", driverId)
    .maybeSingle();
  if (!driver || driver.role !== "repartidor" || driver.store_id !== order.store_id) {
    return { error: "El repartidor elegido no es válido para esta sucursal." };
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: "driver_assigned", assigned_driver_id: driverId })
    .eq("id", orderId);
  if (error) return { error: "No se pudo asignar el repartidor." };

  await insertHistory(supabase, orderId, "driver_assigned", profile.id);
  revalidatePath("/admin/pedidos");
  return { success: "Repartidor asignado." };
}

export async function confirmReturnedToStore(orderId: string): Promise<OrderActionState> {
  const profile = await requireRole(["admin", "operaciones"]);
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, user_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { error: "Pedido no encontrado." };
  if (order.status !== "returning_to_store") {
    return { error: "El pedido no está volviendo a la tienda." };
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: "returned_to_store" })
    .eq("id", orderId);
  if (error) return { error: "No se pudo confirmar la devolución." };

  await insertHistory(supabase, orderId, "returned_to_store", profile.id);
  revalidatePath("/admin/pedidos");
  await notifyOwner(orderId, order.user_id, "returned_to_store", () => returnedToStoreTemplate(orderId));

  return { success: "Devolución confirmada." };
}

// ---------- Repartidor ----------

export async function markInRoute(orderId: string): Promise<OrderActionState> {
  const profile = await requireRole(["repartidor"]);
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, assigned_driver_id, user_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { error: "Pedido no encontrado." };
  if (order.assigned_driver_id !== profile.id) return { error: "Este pedido no está asignado a vos." };
  if (order.status !== "driver_assigned") return { error: "El pedido no está listo para salir." };

  const { error } = await supabase.from("orders").update({ status: "in_route" }).eq("id", orderId);
  if (error) return { error: "No se pudo actualizar el pedido." };

  await insertHistory(supabase, orderId, "in_route", profile.id);
  revalidatePath("/repartidor");
  // Aceptación 1 de la Fase 5: in_route SIEMPRE dispara email + notifications_log.
  await notifyOwner(orderId, order.user_id, "in_route", () => inRouteTemplate(orderId));

  return { success: "Pedido marcado en camino." };
}

export async function markAtAddress(orderId: string): Promise<OrderActionState> {
  const profile = await requireRole(["repartidor"]);
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, assigned_driver_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { error: "Pedido no encontrado." };
  if (order.assigned_driver_id !== profile.id) return { error: "Este pedido no está asignado a vos." };
  if (order.status !== "in_route") return { error: "El pedido no está en camino." };

  const { error } = await supabase.from("orders").update({ status: "at_address" }).eq("id", orderId);
  if (error) return { error: "No se pudo actualizar el pedido." };

  await insertHistory(supabase, orderId, "at_address", profile.id);
  revalidatePath("/repartidor");
  return { success: "Marcado como en la dirección." };
}

export async function markDeliveryIssue(orderId: string, reason: string): Promise<OrderActionState> {
  const profile = await requireRole(["repartidor"]);
  if (!reason.trim()) return { error: "Indicá el motivo del problema." };
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, assigned_driver_id, user_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { error: "Pedido no encontrado." };
  if (order.assigned_driver_id !== profile.id) return { error: "Este pedido no está asignado a vos." };
  if (order.status !== "at_address") return { error: "El pedido no está en la dirección." };

  const { error } = await supabase
    .from("orders")
    .update({
      status: "delivery_issue",
      delivery_issue_reason: reason.trim(),
      delivery_issue_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (error) return { error: "No se pudo registrar el problema." };

  await insertHistory(supabase, orderId, "delivery_issue", profile.id, reason.trim());
  revalidatePath("/repartidor");
  await notifyOwner(orderId, order.user_id, "delivery_issue", () => deliveryIssueTemplate(orderId));

  return { success: "Problema registrado." };
}

export async function markReturningToStore(orderId: string): Promise<OrderActionState> {
  const profile = await requireRole(["repartidor"]);
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, assigned_driver_id, delivery_issue_at")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { error: "Pedido no encontrado." };
  if (order.assigned_driver_id !== profile.id) return { error: "Este pedido no está asignado a vos." };
  if (order.status !== "delivery_issue" || !order.delivery_issue_at) {
    return { error: "El pedido no tiene un problema de entrega abierto." };
  }

  // Aceptación 3 de la Fase 5: antes de MAX_DELIVERY_ISSUE_WAIT_MINUTES desde
  // delivery_issue_at, esta transición se rechaza — no es una restricción de
  // UI, se revalida acá con la hora real del servidor.
  const elapsedMinutes = (Date.now() - new Date(order.delivery_issue_at).getTime()) / 60000;
  if (elapsedMinutes < maxDeliveryIssueWaitMinutes()) {
    const remaining = Math.ceil(maxDeliveryIssueWaitMinutes() - elapsedMinutes);
    return { error: `Todavía hay que esperar ${remaining} minuto(s) antes de volver a la tienda.` };
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: "returning_to_store" })
    .eq("id", orderId);
  if (error) return { error: "No se pudo actualizar el pedido." };

  await insertHistory(supabase, orderId, "returning_to_store", profile.id);
  revalidatePath("/repartidor");
  return { success: "Marcado como volviendo a la tienda." };
}

export type ConfirmCodeState = { error?: string; success?: string; locked?: boolean } | null;

export async function confirmDeliveryCode(
  orderId: string,
  code: string,
): Promise<ConfirmCodeState> {
  const profile = await requireRole(["repartidor"]);
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, status, assigned_driver_id, delivery_confirmation_code, delivery_code_attempts, delivery_code_locked, user_id",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { error: "Pedido no encontrado." };
  if (order.assigned_driver_id !== profile.id) return { error: "Este pedido no está asignado a vos." };
  if (!["at_address", "delivery_issue"].includes(order.status)) {
    return { error: "El pedido no está listo para confirmar entrega." };
  }

  // Aceptación 5 (Fase 6, misma mecánica): una vez bloqueado, se rechaza
  // cualquier intento — incluso con el código correcto — hasta que
  // Operaciones/Admin regenere el código o confirme manualmente.
  if (order.delivery_code_locked) {
    return { error: "Se bloqueó el código tras 5 intentos. Pedí a Operaciones que lo regenere.", locked: true };
  }

  if (code.trim() !== order.delivery_confirmation_code) {
    const attempts = order.delivery_code_attempts + 1;
    const locked = attempts >= 5;
    await supabase
      .from("orders")
      .update({ delivery_code_attempts: attempts, delivery_code_locked: locked })
      .eq("id", orderId);
    return locked
      ? { error: "Código incorrecto. Se bloqueó tras 5 intentos.", locked: true }
      : { error: `Código incorrecto (intento ${attempts}/5).` };
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: "delivered", delivered_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) return { error: "No se pudo confirmar la entrega." };

  await insertHistory(supabase, orderId, "delivered", profile.id);
  revalidatePath("/repartidor");
  await notifyOwner(orderId, order.user_id, "delivered", () => deliveredTemplate(orderId));

  return { success: "Entrega confirmada." };
}

// ---------- Cliente: resolución tras returned_to_store ----------

export async function choosePickupFree(orderId: string): Promise<OrderActionState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Necesitás iniciar sesión." };

  // El chequeo de pertenencia/estado se hace con el cliente normal (respeta
  // RLS: si el pedido no es suyo, `order` sale null). La escritura en sí usa
  // el cliente admin porque `orders`/`order_status_history` no tienen policy
  // de INSERT/UPDATE para `customer` (sección 10 — el cliente no puede editar
  // sus pedidos directamente); acá sí corresponde porque ya se validó arriba
  // que es el dueño y que el pedido está en el único estado donde puede elegir.
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, user_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.user_id !== profile.id) return { error: "Pedido no encontrado." };
  if (order.status !== "returned_to_store") return { error: "Este pedido no está disponible para elegir." };

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase
    .from("orders")
    .update({ status: "ready_for_pickup" })
    .eq("id", orderId);
  if (error) return { error: "No se pudo actualizar el pedido." };

  await insertHistory(adminSupabase, orderId, "ready_for_pickup", profile.id, "Cliente eligió retiro gratis");
  revalidatePath(`/pedido/${orderId}`);
  return { success: "Listo, podés retirarlo en tienda sin costo adicional." };
}

// ---------- Repetir pedido (Fase 10) ----------

export type ReorderItem = {
  productId: string;
  name: string;
  slug: string;
  price: number;
  imagePath: string | null;
  quantity: number;
};

export type ReorderResult = { available: ReorderItem[]; unavailable: string[] };

// Aceptación 1 de la Fase 10: si un producto del pedido original ya no está
// disponible, se informa pero NO bloquea el resto del repedido. Devuelve
// datos (no un form state) porque el resultado lo consume un client
// component para armar el carrito local, no un <form>.
//
// Nota de alcance: `order_item_options` guarda un snapshot de texto (nombre
// del grupo/valor), no el id vivo de `product_option_values` — no hay forma
// de reconstruir con certeza cuál era la variante exacta. "Repetir pedido"
// vuelve a agregar el producto base, sin las variantes originales; precio y
// disponibilidad siempre se recalculan contra el catálogo actual.
export async function getReorderItems(orderId: string): Promise<ReorderResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { available: [], unavailable: [] };

  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, user_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.user_id !== profile.id) return { available: [], unavailable: [] };

  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, product_name_snapshot, quantity")
    .eq("order_id", orderId);

  const productIds = [...new Set((items ?? []).map((i) => i.product_id))];
  const { data: products } = productIds.length
    ? await supabase
        .from("products")
        .select("id, name, slug, price, is_active, images:product_images(storage_path, sort_order)")
        .in("id", productIds)
    : { data: [] as { id: string; name: string; slug: string; price: number; is_active: boolean; images: { storage_path: string; sort_order: number }[] }[] };
  const productMap = new Map((products ?? []).map((p) => [p.id, p]));

  const available: ReorderItem[] = [];
  const unavailable: string[] = [];

  for (const item of items ?? []) {
    const product = productMap.get(item.product_id);
    if (!product || !product.is_active) {
      unavailable.push(item.product_name_snapshot);
      continue;
    }
    const firstImage = [...product.images].sort((a, b) => a.sort_order - b.sort_order)[0];
    available.push({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      imagePath: firstImage?.storage_path ?? null,
      quantity: item.quantity,
    });
  }

  return { available, unavailable };
}
