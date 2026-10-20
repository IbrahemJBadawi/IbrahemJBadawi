import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft, RotateCcw, Truck } from "lucide-react";
import { getProduct, getRelatedProducts, getShippingOptions } from "@/lib/data/catalog";
import { isFavorite } from "@/lib/data/favorites";
import { formatMoney } from "@/lib/money";
import { t } from "@/lib/i18n/ar";
import { Gallery } from "@/components/product/Gallery";
import { AddToCart } from "@/components/product/AddToCart";
import { FavoriteButton } from "@/components/product/FavoriteButton";
import { Price } from "@/components/product/Price";
import { ProductGrid } from "@/components/product/ProductCard";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/States";

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: "منتج غير موجود" };
  const description = (p.description_ar ?? p.name_ar).slice(0, 160);
  return {
    title: p.name_ar,
    description,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { title: p.name_ar, description, images: p.images[0] ? [{ url: p.images[0].url }] : undefined },
    robots: p.is_demo ? { index: false } : undefined,
  };
}

async function Favorite({ id, slug }: { id: string; slug: string }) {
  return <FavoriteButton productId={id} slug={slug} initial={await isFavorite(id)} />;
}

async function Delivery({ currency, overrides }: { currency: string; overrides: Record<string, { min: number; max: number }> }) {
  const zones = (await getShippingOptions()).filter((z) => z.currency_code === currency);
  if (!zones.length) {
    return <p className="text-sm leading-7 text-muted">راسلنا وسنرتب التوصيل إلى منطقتك.</p>;
  }
  const days = zones.map((z) => {
    const o = overrides[z.country_code];
    return { min: Math.max(z.min_days, o?.min ?? 0), max: Math.max(z.max_days, o?.max ?? 0) };
  });
  const min = Math.min(...days.map((d) => d.min));
  const max = Math.max(...days.map((d) => d.max));
  const fee = (z: (typeof zones)[number]) =>
    z.fee_on_confirmation ? "حسب العنوان" : Number(z.rate) === 0 ? "مجاني" : formatMoney(z.rate, z.currency_code);
  return (
    <div className="space-y-3 text-sm">
      <p className="leading-7 text-ink-soft">
        نوصل إلى <strong className="text-ink">جميع محافظات الضفة الغربية وقطاع غزة</strong> خلال {min}–{max} أيام عمل من تأكيد الدفع.
      </p>
      <details className="rounded-2xl border border-line bg-paper px-4 py-2">
        <summary className="cursor-pointer py-1 text-xs font-semibold text-beige-deep">رسوم التوصيل حسب المحافظة</summary>
        <ul className="mt-2 divide-y divide-line">
          {zones.map((z) => (
            <li key={z.id} className="flex items-center justify-between gap-3 py-2">
              <span>{z.governorate_name ?? z.country_name}</span>
              <span className="text-xs text-muted">
                {fee(z)}
                {z.free_shipping_threshold && !z.fee_on_confirmation && <> · مجاني فوق {formatMoney(z.free_shipping_threshold, z.currency_code)}</>}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

async function Related({ id, category }: { id: string; category: string | null }) {
  const items = await getRelatedProducts(id, category);
  if (!items.length) return null;
  return (
    <section className="container-page border-t border-line py-14">
      <h2 className="mb-7 text-xl font-bold">قد يعجبك أيضًا</h2>
      <ProductGrid products={items} />
    </section>
  );
}

async function ProductContent({ params }: { params: PageProps<"/product/[slug]">["params"] }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();
  const available = p.availability === "available" && (p.variants.length === 0 || p.variants.some((v) => v.availability === "available"));
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name_ar,
    description: p.description_ar ?? undefined,
    image: p.images.map((i) => i.url),
    brand: { "@type": "Brand", name: "Al JAMAL Store" },
    offers: {
      "@type": "Offer",
      url: `${site}/product/${p.slug}`,
      priceCurrency: p.currency_code,
      price: p.sale_price ?? p.price,
      availability: available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      {!p.is_demo && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      )}
      <nav aria-label="مسار التصفح" className="container-page flex items-center gap-1 py-4 text-xs text-muted">
        <Link href="/" className="hover:text-ink">الرئيسية</Link>
        <ChevronLeft className="size-3" />
        {p.category_slug ? (
          <Link href={`/category/${p.category_slug}`} className="hover:text-ink">{p.category_name}</Link>
        ) : (
          <Link href="/products" className="hover:text-ink">المنتجات</Link>
        )}
        <ChevronLeft className="size-3" />
        <span className="line-clamp-1 text-ink-soft" aria-current="page">{p.name_ar}</span>
      </nav>
      <div className="container-page grid gap-8 pb-14 md:grid-cols-2 md:gap-12 lg:gap-16">
        <Gallery images={p.images} name={p.name_ar} />
        <div className="md:pt-4">
          <div className="flex flex-wrap gap-2">
            {p.is_demo && <Badge tone="dark">منتج تجريبي — ليس للبيع</Badge>}
            {!available && <Badge tone="outline">{t.availability[p.availability === "available" ? "out_of_stock" : p.availability]}</Badge>}
          </div>
          <h1 className="mt-3 text-2xl font-bold leading-[1.5] md:text-3xl">{p.name_ar}</h1>
          {p.name_en && <p className="mt-1 text-sm text-muted" dir="ltr">{p.name_en}</p>}
          <div className="mt-5 mb-8 md:mb-0">
            <Price price={p.price} salePrice={p.sale_price} currency={p.currency_code} size="lg" />
          </div>
          {/* On phones these wrappers dissolve so the add-to-cart bar can stay in view while scrolling. */}
          <div className="max-md:contents md:mt-8 md:flex md:items-start md:gap-3">
            <div className="max-md:contents md:flex-1">
              <AddToCart productId={p.id} variants={p.variants} available={available} currency={p.currency_code} />
            </div>
          </div>
          <p className="mt-4 text-xs leading-6 text-muted">
            <strong className="text-ink">اطلب الآن وادفع لاحقًا:</strong> نحجز مقاسك لدى المورد المحلي ونرسل لك السعر النهائي مع التوصيل، ثم تدفع بكل راحة.
          </p>
          <div className="mt-4">
            <Suspense fallback={<span className="inline-block size-12" />}>
              <Favorite id={p.id} slug={p.slug} />
            </Suspense>
          </div>

          {p.description_ar && (
            <section className="mt-10 border-t border-line pt-6">
              <h2 className="mb-3 text-sm font-bold">الوصف</h2>
              <p className="whitespace-pre-line text-sm leading-8 text-ink-soft">{p.description_ar}</p>
            </section>
          )}
          {p.origin_country && (
            <p className="mt-4 text-sm text-muted">بلد المنشأ: <span className="text-ink">{p.origin_country}</span></p>
          )}
          <details className="group mt-6 border-t border-line pt-5" open>
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold">
              <Truck className="size-4 text-beige-deep" /> التوصيل
            </summary>
            <div className="mt-4">
              <Suspense fallback={<p className="text-sm text-muted">جارٍ التحميل…</p>}>
                <Delivery currency={p.currency_code} overrides={p.delivery_overrides} />
              </Suspense>
            </div>
          </details>
          <details className="mt-5 border-t border-line pt-5">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold">
              <RotateCcw className="size-4 text-beige-deep" /> الاستبدال والإرجاع
            </summary>
            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-ink-soft">
              {p.return_policy || "تُطبق سياسة الاستبدال والإرجاع العامة للمتجر."}{" "}
              <Link href="/policies/returns" className="font-semibold text-beige-deep underline underline-offset-4">السياسة الكاملة</Link>
            </p>
          </details>
        </div>
      </div>
      <Suspense fallback={null}>
        <Related id={p.id} category={p.category_slug} />
      </Suspense>
    </>
  );
}

export default function ProductPage({ params }: PageProps<"/product/[slug]">) {
  return (
    <Suspense
      fallback={
        <div className="container-page grid gap-8 py-14 md:grid-cols-2 md:gap-12">
          <Skeleton className="aspect-[3/4] w-full" />
          <div className="space-y-4"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-6 w-1/3" /><Skeleton className="h-12 w-full" /></div>
        </div>
      }
    >
      <ProductContent params={params} />
    </Suspense>
  );
}
