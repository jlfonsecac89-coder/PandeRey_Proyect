"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";

export type BannerActionState = { error?: string; success?: string } | null;

export async function createBanner(
  _prev: BannerActionState,
  formData: FormData,
): Promise<BannerActionState> {
  await requireRole(["admin", "marketing"]);

  const title = String(formData.get("title") || "").trim();
  const subtitle = String(formData.get("subtitle") || "").trim() || null;
  const linkUrl = String(formData.get("link_url") || "").trim() || null;
  const file = formData.get("image") as File | null;

  if (!title || !file || file.size === 0) {
    return { error: "Completa el título y elegí una imagen." };
  }
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    return { error: "Formato no soportado. Usa PNG, JPG o WEBP." };
  }

  const supabase = await createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("banners").upload(path, file, {
    contentType: file.type,
  });
  if (uploadError) return { error: "No se pudo subir la imagen." };

  const { error: insertError } = await supabase.from("banners").insert({
    title,
    subtitle,
    link_url: linkUrl,
    image_storage_path: path,
  });
  if (insertError) {
    await supabase.storage.from("banners").remove([path]);
    return { error: "No se pudo crear el banner." };
  }

  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { success: `Banner "${title}" creado.` };
}

export async function toggleBannerActive(bannerId: string, isActive: boolean) {
  await requireRole(["admin", "marketing"]);
  const supabase = await createClient();
  await supabase.from("banners").update({ is_active: isActive }).eq("id", bannerId);
  revalidatePath("/admin/banners");
  revalidatePath("/");
}

export async function deleteBanner(bannerId: string, storagePath: string) {
  await requireRole(["admin", "marketing"]);
  const supabase = await createClient();
  await supabase.storage.from("banners").remove([storagePath]);
  await supabase.from("banners").delete().eq("id", bannerId);
  revalidatePath("/admin/banners");
  revalidatePath("/");
}
