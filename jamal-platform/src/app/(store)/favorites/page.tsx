import type { Metadata } from "next";
import { Heart } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listFavorites } from "@/lib/data/favorites";
import { ProductGrid } from "@/components/product/ProductCard";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";

export const metadata: Metadata = { title: "المفضلة", robots: { index: false } };

// Auth-gated: rendering waits for the session (redirects to login otherwise).
export const instant = false;

export default async function FavoritesPage() {
  const user = await requireUser("/favorites");
  const items = await listFavorites(user.id, user.email);
  return (
    <div className="container-page py-8 md:py-12">
      <h1 className="mb-8 text-2xl font-bold md:text-3xl">المفضلة</h1>
      {items.length ? (
        <ProductGrid products={items} />
      ) : (
        <EmptyState icon={<Heart className="size-10" strokeWidth={1.3} />} title="قائمة المفضلة فارغة" description="اضغط على أيقونة القلب في صفحة أي منتج لحفظه هنا." action={<ButtonLink href="/products">تصفح المنتجات</ButtonLink>} />
      )}
    </div>
  );
}
