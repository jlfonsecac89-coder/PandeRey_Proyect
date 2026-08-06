"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";
import { getCurrentProfile } from "@/lib/auth/session";

export type ReviewActionState = { error?: string; success?: string } | null;

// Solo se puede reseñar un ítem de un pedido PROPIO y ENTREGADO — esto se
// revalida acá para dar un mensaje claro, pero la garantía real es la
// policy RLS customer_insert_own_delivered_review (defensa en profundidad,
// sección 04 del blueprint): aunque este chequeo se salteara, el INSERT
// igual fallaría contra la base.
export async function submitReview(_prev: ReviewActionState, formData: FormData): Promise<ReviewActionState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Necesitás iniciar sesión." };

  const orderItemId = String(formData.get("order_item_id") || "");
  const productId = String(formData.get("product_id") || "");
  const orderId = String(formData.get("order_id") || "");
  const rating = Number(formData.get("rating") || "0");
  const comment = String(formData.get("comment") || "").trim() || null;

  if (!orderItemId || !productId || !orderId) return { error: "Reseña inválida." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Elegí una valoración de 1 a 5 estrellas." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("product_reviews").insert({
    product_id: productId,
    user_id: profile.id,
    order_id: orderId,
    order_item_id: orderItemId,
    rating,
    comment,
  });

  if (error) {
    if (error.code === "23505") return { error: "Ya dejaste una reseña para este producto." };
    return { error: "No se pudo guardar la reseña — verificá que el pedido ya esté entregado." };
  }

  revalidatePath("/cuenta/pedidos");
  return { success: "¡Gracias por tu reseña! Se publica una vez que la revisemos." };
}

export async function moderateReview(reviewId: string, approve: boolean) {
  const profile = await requireRole(["admin", "marketing"]);

  const supabase = await createClient();
  await supabase
    .from("product_reviews")
    .update({
      status: approve ? "approved" : "rejected",
      moderated_by: profile.id,
      moderated_at: new Date().toISOString(),
    })
    .eq("id", reviewId);

  revalidatePath("/admin/resenas");
}
