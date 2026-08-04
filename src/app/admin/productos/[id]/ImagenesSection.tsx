"use client";

import { useActionState } from "react";
import { uploadProductImage, deleteProductImage } from "@/lib/catalog/actions";
import { FormMessage } from "@/components/auth/AuthCard";

type ProductImage = { id: string; storage_path: string };

export function ImagenesSection({
  productId,
  images,
  publicBaseUrl,
}: {
  productId: string;
  images: ProductImage[];
  publicBaseUrl: string;
}) {
  const [state, formAction, pending] = useActionState(uploadProductImage, null);

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
        Fotos
      </h2>
      <FormMessage error={state?.error} success={state?.success} />
      <div className="mt-2 flex flex-wrap gap-3">
        {images.map((img) => (
          <div key={img.id} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${publicBaseUrl}/${img.storage_path}`}
              alt=""
              className="h-24 w-24 rounded-md border border-charcoal-border object-cover"
            />
            <form
              action={deleteProductImage.bind(null, img.id, productId, img.storage_path)}
              className="absolute -right-2 -top-2"
            >
              <button
                type="submit"
                className="rounded-full bg-background/90 px-1.5 text-xs text-red-400 border border-charcoal-border"
                title="Eliminar"
              >
                ✕
              </button>
            </form>
          </div>
        ))}
      </div>
      <form action={formAction} className="mt-3 flex items-center gap-3">
        <input type="hidden" name="product_id" value={productId} />
        <input
          type="file"
          name="file"
          accept="image/png,image/jpeg,image/webp"
          required
          className="text-sm text-foreground/70 file:mr-3 file:rounded-md file:border-0 file:bg-charcoal-border file:px-3 file:py-1.5 file:text-xs file:text-foreground"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gold px-3 py-1.5 text-xs font-medium text-background hover:bg-gold-hover disabled:opacity-50"
        >
          {pending ? "Subiendo..." : "Subir"}
        </button>
      </form>
    </section>
  );
}
