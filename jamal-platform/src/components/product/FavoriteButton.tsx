"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleFavorite } from "@/lib/actions/favorites";

export function FavoriteButton({ productId, initial, slug }: { productId: string; initial: boolean; slug: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [fav, setFav] = useOptimistic(initial);
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={fav}
      aria-label={fav ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
      onClick={() =>
        start(async () => {
          setFav(!fav);
          const res = await toggleFavorite(productId);
          if (res.needsLogin) router.push(`/login?next=/product/${slug}`);
        })
      }
      className="inline-flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-card)] border border-line bg-paper transition-colors hover:border-ink"
    >
      <Heart className={`size-5 ${fav ? "fill-danger text-danger" : ""}`} strokeWidth={1.6} />
    </button>
  );
}
