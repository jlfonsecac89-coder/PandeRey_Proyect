"use client";

import { useActionState } from "react";
import { createBanner, deleteBanner, toggleBannerActive, type BannerActionState } from "@/lib/banners/actions";
import { FormMessage } from "@/components/auth/AuthCard";

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  link_url: string | null;
  image_storage_path: string;
  is_active: boolean;
};

export function BannersSection({ banners, publicBaseUrl }: { banners: Banner[]; publicBaseUrl: string }) {
  const [state, formAction, pending] = useActionState<BannerActionState, FormData>(createBanner, null);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {banners.map((banner) => (
          <div key={banner.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${publicBaseUrl}/${banner.image_storage_path}`}
              alt={banner.title}
              className="h-32 w-full rounded-md object-cover"
            />
            <p className="mt-2 text-sm text-foreground/90">{banner.title}</p>
            {banner.subtitle && <p className="text-xs text-foreground/50">{banner.subtitle}</p>}
            <div className="mt-2 flex items-center gap-2">
              <form action={toggleBannerActive.bind(null, banner.id, !banner.is_active)}>
                <button
                  type="submit"
                  className={`rounded-full px-2 py-0.5 text-xs ${banner.is_active ? "border border-gold text-gold" : "border border-charcoal-border text-foreground/50"}`}
                >
                  {banner.is_active ? "Activo" : "Inactivo"}
                </button>
              </form>
              <form action={deleteBanner.bind(null, banner.id, banner.image_storage_path)}>
                <button type="submit" className="text-xs text-red-400 hover:underline">
                  Eliminar
                </button>
              </form>
            </div>
          </div>
        ))}
        {banners.length === 0 && <p className="text-sm text-foreground/40">Sin banners todavía.</p>}
      </div>

      <div className="max-w-md rounded-lg border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-sm font-semibold text-gold">Nuevo banner</h2>
        <FormMessage error={state?.error} success={state?.success} />
        <form action={formAction} className="mt-2 space-y-2">
          <input
            name="title"
            placeholder="Título"
            required
            className="w-full rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
          />
          <input
            name="subtitle"
            placeholder="Subtítulo (opcional)"
            className="w-full rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
          />
          <input
            name="link_url"
            placeholder="Link al hacer clic (opcional, ej. /tienda)"
            className="w-full rounded-md border border-charcoal-border bg-background px-3 py-1.5 text-sm"
          />
          <input
            type="file"
            name="image"
            accept="image/png,image/jpeg,image/webp"
            required
            className="w-full text-sm text-foreground/70 file:mr-3 file:rounded-md file:border-0 file:bg-charcoal-border file:px-3 file:py-1.5 file:text-xs file:text-foreground"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-gold px-4 py-1.5 text-sm font-medium text-ink hover:bg-gold-hover disabled:opacity-50"
          >
            {pending ? "Subiendo..." : "Crear banner"}
          </button>
        </form>
      </div>
    </div>
  );
}
