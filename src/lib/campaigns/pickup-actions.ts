"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";
import { logAction } from "@/lib/audit/log-action";
import { isModuleEnabled } from "@/lib/settings/modules";
import { checkReceipt } from "@/lib/orders/receipt";
import { sendNotification, getUserEmail } from "@/lib/notifications/send";
import { deliveredTemplate } from "@/lib/notifications/templates";
import { getOrderLabel } from "@/lib/orders/order-number";

export type PickupActionState = { error?: string; success?: string } | null;

// Estados desde los que se puede entregar un pedido de campaña: el equipo no
// siempre pasa por "listo para retiro" cuando entrega por día.
const DELIVERABLE_STATUSES = ["paid", "preparing", "ready_for_pickup"];

function revalidatePickups() {
  revalidatePath("/admin/retiros");
  revalidatePath("/admin/reportes/retiros");
  revalidatePath("/admin/pedidos");
}

// Marca como retirada la parte de un pedido que corresponde a un día. Cuando es
// la última parte pendiente, cierra el pedido: con facturación manual exige el
// N° de boleta (una boleta por pedido, la del último retiro).
export async function markCampaignPickup(pickupId: string, receiptNumber?: string): Promise<PickupActionState> {
  const profile = await requireRole(["admin", "operaciones"]);
  const supabase = await createClient();

  const { data: pickup } = await supabase
    .from("order_campaign_pickups")
    .select("id, order_id, picked_up_at")
    .eq("id", pickupId)
    .maybeSingle();
  if (!pickup) return { error: "Retiro no encontrado." };
  if (pickup.picked_up_at) return { error: "Este retiro ya está marcado." };

  const { data: order } = await supabase
    .from("orders")
    .select("id, user_id, status, order_number")
    .eq("id", pickup.order_id)
    .maybeSingle();
  if (!order || order.order_number == null) return { error: "El pedido no tiene el pago confirmado." };
  if (!DELIVERABLE_STATUSES.includes(order.status)) return { error: "El pedido no está en un estado entregable." };

  const { count: pendingCount } = await supabase
    .from("order_campaign_pickups")
    .select("id", { count: "exact", head: true })
    .eq("order_id", order.id)
    .is("picked_up_at", null);
  const closesOrder = pendingCount === 1;

  // Se valida la boleta ANTES de marcar el retiro para no dejar el último día
  // entregado y el pedido sin cerrar.
  let receipt: string | null = null;
  if (closesOrder && !(await isModuleEnabled("invoicing"))) {
    const checked = checkReceipt(receiptNumber);
    if ("error" in checked) return { error: checked.error };
    receipt = checked.receipt;

    const { data: duplicate } = await supabase
      .from("orders")
      .select("id")
      .eq("receipt_number", receipt)
      .neq("id", order.id)
      .maybeSingle();
    if (duplicate) return { error: "Ese N° de boleta ya está registrado en otro pedido." };
  }

  const nowIso = new Date().toISOString();
  const { data: marked, error: markError } = await supabase
    .from("order_campaign_pickups")
    .update({ picked_up_at: nowIso, picked_up_by: profile.id })
    .eq("id", pickupId)
    .is("picked_up_at", null)
    .select("id")
    .maybeSingle();
  if (markError) return { error: "No se pudo marcar el retiro." };
  if (!marked) return { error: "Este retiro ya está marcado." };

  await logAction({
    actor: profile,
    action: "campaign_pickup_marked",
    entityType: "order",
    entityId: order.id,
    after: { pickup_id: pickupId, closes_order: closesOrder },
  });

  if (!closesOrder) {
    revalidatePickups();
    return { success: "Retiro marcado." };
  }

  const { data: closed, error: closeError } = await supabase
    .from("orders")
    .update({
      status: "delivered",
      delivered_at: nowIso,
      delivered_by: profile.id,
      ...(receipt ? { receipt_number: receipt } : {}),
    })
    .eq("id", order.id)
    .in("status", DELIVERABLE_STATUSES)
    .select("id")
    .maybeSingle();

  if (closeError || !closed) {
    // No se pudo cerrar (ej. boleta duplicada en una carrera): se deshace la
    // marca para que el último retiro se pueda reintentar con otro N°.
    await supabase
      .from("order_campaign_pickups")
      .update({ picked_up_at: null, picked_up_by: null })
      .eq("id", pickupId);
    return {
      error:
        closeError?.code === "23505"
          ? "Ese N° de boleta ya está registrado en otro pedido."
          : "No se pudo cerrar el pedido. Intenta de nuevo.",
    };
  }

  await supabase.from("order_status_history").insert({
    order_id: order.id,
    status: "delivered",
    changed_by: profile.id,
    note: receipt ? `Retiros completos. Boleta N° ${receipt}` : "Retiros completos",
  });
  await logAction({
    actor: profile,
    action: "pickup_confirmed",
    entityType: "order",
    entityId: order.id,
    after: receipt ? { receipt_number: receipt } : null,
  });

  const email = await getUserEmail(order.user_id);
  if (email) {
    const { subject, html } = deliveredTemplate(await getOrderLabel(order.id));
    await sendNotification({ userId: order.user_id, orderId: order.id, to: email, template: "delivered", subject, html });
  }

  revalidatePickups();
  return { success: "Retiro marcado y pedido cerrado." };
}

// Corrige una marca hecha por error. Solo mientras el pedido no esté cerrado:
// uno entregado ya tiene boleta y correo enviado.
export async function undoCampaignPickup(pickupId: string): Promise<PickupActionState> {
  const profile = await requireRole(["admin", "operaciones"]);
  const supabase = await createClient();

  const { data: pickup } = await supabase
    .from("order_campaign_pickups")
    .select("id, order_id, picked_up_at")
    .eq("id", pickupId)
    .maybeSingle();
  if (!pickup || !pickup.picked_up_at) return { error: "Ese retiro no está marcado." };

  const { data: order } = await supabase.from("orders").select("status").eq("id", pickup.order_id).maybeSingle();
  if (!order || order.status === "delivered") {
    return { error: "El pedido ya está cerrado; no se puede deshacer el retiro." };
  }

  const { error } = await supabase
    .from("order_campaign_pickups")
    .update({ picked_up_at: null, picked_up_by: null })
    .eq("id", pickupId);
  if (error) return { error: "No se pudo deshacer el retiro." };

  await logAction({
    actor: profile,
    action: "campaign_pickup_undone",
    entityType: "order",
    entityId: pickup.order_id,
    after: { pickup_id: pickupId },
  });
  revalidatePickups();
  return { success: "Retiro deshecho." };
}
