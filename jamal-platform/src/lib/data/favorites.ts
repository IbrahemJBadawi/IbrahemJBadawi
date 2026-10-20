import "server-only";
import { getCurrentUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import type { ProductCard } from "./catalog";

export async function isFavorite(productId: string) {
  const user = await getCurrentUser();
  if (!user) return false;
  const rows = await asUser(user, (tx) =>
    tx.query("select 1 from public.favorites where user_id = $1 and product_id = $2", [user.id, productId]),
  );
  return rows.length > 0;
}

export async function listFavorites(userId: string, email: string | null) {
  return asUser({ id: userId, email }, (tx) =>
    tx.query<ProductCard>(
      `select p.id, p.slug, p.name_ar, p.price::text, p.sale_price::text, p.currency_code,
              p.images->0->>'url' as image, p.images->0->>'alt' as image_alt, p.availability, p.is_demo,
              c.slug as category_slug, c.name_ar as category_name,
              coalesce((select array_agg(distinct v.color_hex) from public.product_variants v
                        where v.product_id = p.id and v.color_hex is not null), '{}') as colors
       from public.favorites f
       join public.products p on p.id = f.product_id
       left join public.categories c on c.id = p.category_id
       where f.user_id = $1
       order by f.created_at desc`,
      [userId],
    ),
  );
}
