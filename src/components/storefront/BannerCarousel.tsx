"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  link_url: string | null;
  image_storage_path: string;
};

export function BannerCarousel({ banners, publicBaseUrl }: { banners: Banner[]; publicBaseUrl: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (banners.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % banners.length), 6000);
    return () => clearInterval(id);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const current = banners[index];
  const content = (
    <div className="relative aspect-[21/9] w-full overflow-hidden rounded-lg border border-charcoal-border bg-charcoal-light sm:aspect-[3/1]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${publicBaseUrl}/${current.image_storage_path}`}
        alt={current.title}
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 flex flex-col items-start justify-end bg-gradient-to-t from-background/90 to-transparent p-6">
        <p className="text-lg font-semibold text-gold sm:text-2xl">{current.title}</p>
        {current.subtitle && <p className="text-sm text-foreground/80">{current.subtitle}</p>}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl px-6">
      {current.link_url ? <Link href={current.link_url}>{content}</Link> : content}
      {banners.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Banner ${i + 1}`}
              className={`h-1.5 w-6 rounded-full ${i === index ? "bg-gold" : "bg-charcoal-border"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
