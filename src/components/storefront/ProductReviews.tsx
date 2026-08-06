import { renderStars } from "@/lib/reviews/stars";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profile: { full_name: string } | { full_name: string }[] | null;
};

export function ProductReviews({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <p className="mt-2 text-sm text-foreground/40">
        Todavía no hay reseñas para este producto — ¡sé el primero en dejar una tras tu compra!
      </p>
    );
  }

  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <div className="mt-2">
      <p className="text-sm text-foreground/80">
        <span className="text-gold">{renderStars(avg)}</span>{" "}
        <span className="text-foreground/50">
          {avg.toFixed(1)} de 5 · {reviews.length} reseña{reviews.length === 1 ? "" : "s"}
        </span>
      </p>
      <ul className="mt-3 space-y-3">
        {reviews.map((r) => {
          const author = Array.isArray(r.profile) ? r.profile[0] : r.profile;
          return (
            <li key={r.id} className="rounded-md border border-charcoal-border bg-charcoal-light p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gold">{renderStars(r.rating)}</span>
                <span className="text-xs text-foreground/40">
                  {new Date(r.created_at).toLocaleDateString("es-CL")}
                </span>
              </div>
              <p className="mt-1 text-xs text-foreground/50">{author?.full_name}</p>
              {r.comment && <p className="mt-1 text-foreground/70">{r.comment}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
