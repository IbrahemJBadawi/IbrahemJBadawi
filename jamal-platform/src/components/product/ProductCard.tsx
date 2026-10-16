import Link from "next/link";
import { ArrowUpLeft } from "lucide-react";
import type { ProductCard as Card } from "@/lib/data/catalog";
import { Price } from "./Price";
import { ProductImage } from "./ProductImage";

export function ProductCard({ product, priority = false }: { product: Card; priority?: boolean }) {
  const unavailable = product.availability !== "available";
  return (
    <article className="group relative">
      <Link href={`/product/${product.slug}`} className="block focus-visible:outline-offset-4">
        <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-card)] bg-sand">
          <ProductImage
            src={product.image}
            alt={product.image_alt || product.name_ar}
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            priority={priority}
            className="transition-transform duration-700 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-x-2 top-2 flex flex-wrap gap-1.5">
            {product.sale_price && !unavailable && (
              <span className="rounded-full bg-paper/95 px-2 py-0.5 text-[0.7rem] font-bold text-danger">تخفيض</span>
            )}
            {product.is_demo && (
              <span className="rounded-full bg-ink/80 px-2 py-0.5 text-[0.7rem] font-semibold text-ivory">منتج تجريبي</span>
            )}
          </div>
          {!unavailable && (
            <span className="absolute bottom-2.5 end-2.5 flex size-9 items-center justify-center rounded-full bg-ink text-ivory shadow-sm transition-transform group-hover:scale-110" aria-hidden>
              <ArrowUpLeft className="size-4" />
            </span>
          )}
          {unavailable && (
            <div className="absolute inset-x-0 bottom-0 bg-paper/90 py-2 text-center text-xs font-semibold text-muted">
              غير متوفر حاليًا
            </div>
          )}
        </div>
        <div className="mt-3 space-y-1">
          {product.category_name && <p className="text-[0.72rem] text-muted">{product.category_name}</p>}
          <h3 className="line-clamp-2 text-sm font-semibold leading-6 text-ink md:text-[0.95rem]">{product.name_ar}</h3>
          <Price price={product.price} salePrice={product.sale_price} currency={product.currency_code} />
          {product.colors.length > 0 && (
            <div className="flex gap-1 pt-1" aria-label={`${product.colors.length} ألوان متاحة`}>
              {product.colors.slice(0, 5).map((c) => (
                <span key={c} className="size-3 rounded-full border border-line" style={{ backgroundColor: c }} />
              ))}
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}

export function ProductGrid({ products }: { products: Card[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 4} />
      ))}
    </div>
  );
}
