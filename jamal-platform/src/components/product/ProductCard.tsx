import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import type { ProductCard as Card } from "@/lib/data/catalog";
import { Price } from "./Price";
import { ProductImage } from "./ProductImage";

export function ProductCard({ product, priority = false }: { product: Card; priority?: boolean }) {
  const unavailable = product.availability !== "available";
  return (
    <article className="group relative overflow-hidden rounded-[var(--radius-card)] border border-line/85 bg-paper shadow-[var(--shadow-card)] transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-beige/70 hover:shadow-[var(--shadow-card-hover)]">
      <Link href={`/product/${product.slug}`} className="block focus-visible:outline-offset-4">
        <div className="relative aspect-[3/4] overflow-hidden bg-sand">
          <ProductImage
            src={product.image}
            alt={product.image_alt || product.name_ar}
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            priority={priority}
            className="transition-transform duration-700 ease-out group-hover:scale-[1.045]"
          />
          <div className="absolute inset-x-3 top-3 flex flex-wrap gap-1.5">
            {product.sale_price && !unavailable && (
              <span className="rounded-full border border-paper/60 bg-paper/95 px-3 py-1 text-[0.7rem] font-bold text-danger shadow-sm backdrop-blur">تخفيض</span>
            )}
            {product.is_demo && (
              <span className="rounded-full bg-ink/80 px-2 py-0.5 text-[0.7rem] font-semibold text-ivory">منتج تجريبي</span>
            )}
          </div>
          {!unavailable && (
            <span className="absolute bottom-3 end-3 flex size-10 items-center justify-center rounded-full border border-white/70 bg-paper/95 text-ink shadow-lg backdrop-blur transition-[background-color,color,transform] duration-200 group-hover:scale-105 group-hover:bg-ink group-hover:text-ivory" aria-hidden>
              <ShoppingBag className="size-[1.1rem]" strokeWidth={1.8} />
            </span>
          )}
          {unavailable && (
            <div className="absolute inset-x-0 bottom-0 bg-paper/90 py-2 text-center text-xs font-semibold text-muted">
              غير متوفر حاليًا
            </div>
          )}
        </div>
        <div className="space-y-1.5 px-3 pb-4 pt-3 md:px-4">
          {product.category_name && <p className="text-[0.72rem] text-muted">{product.category_name}</p>}
          <h3 className="line-clamp-2 min-h-[3rem] text-sm font-bold leading-6 text-ink md:text-[0.95rem]">{product.name_ar}</h3>
          <Price price={product.price} salePrice={product.sale_price} currency={product.currency_code} />
          {product.colors.length > 0 && (
            <div className="flex items-center gap-1.5 pt-1" aria-label={`${product.colors.length} ألوان متاحة`}>
              {product.colors.slice(0, 5).map((c) => (
                <span key={c} className="size-3.5 rounded-full border border-paper shadow-[0_0_0_1px_rgba(29,27,24,0.15)]" style={{ backgroundColor: c }} />
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
    <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-4 md:grid-cols-3 md:gap-x-5 md:gap-y-7 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 4} />
      ))}
    </div>
  );
}
