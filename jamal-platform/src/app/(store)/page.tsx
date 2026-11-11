import { Suspense } from "react";
import { ArrowLeft, PackageCheck, RotateCcw, Search, ShieldCheck, Truck } from "lucide-react";
import { getCategories, listProducts } from "@/lib/data/catalog";
import { ProductCard, ProductGrid } from "@/components/product/ProductCard";
import { ProductImage } from "@/components/product/ProductImage";
import { CategoryCircle, CategoryTile } from "@/components/catalog/CategoryTile";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, ProductGridSkeleton, Skeleton } from "@/components/ui/States";
import Link from "next/link";
import { Monogram } from "@/components/ui/Logo";

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-ivory">
      <div className="pointer-events-none absolute inset-0 -z-10 jamal-editorial-glow" aria-hidden />
      <div className="container-page grid items-center gap-7 pb-10 pt-8 md:grid-cols-2 md:gap-12 md:py-16 lg:gap-20">
        <div>
          <p className="jamal-overline mb-3">مجموعة الموسم · AL JAMAL</p>
          <h1 className="text-[2.4rem] font-extrabold leading-[1.3] md:text-[3.5rem] md:leading-[1.22] lg:text-6xl">
            أناقة{" "}
            <span className="inline-block -rotate-1 rounded-[1.1rem] bg-ink px-4 pb-1 text-ivory shadow-[0_12px_26px_-16px_rgba(29,27,24,0.55)] md:px-6">هادئة</span>
            <br />
            <span className="text-beige-deep">لكل يوم.</span>
          </h1>
          <p className="mt-4 max-w-lg text-[0.95rem] leading-8 text-muted">
            قطع يومية مختارة من موردين محليين في فلسطين. اطلب الآن وادفع بعد تثبيت طلبك.
          </p>
          <form action="/search" role="search" className="mt-6 flex max-w-lg items-center gap-3 rounded-full border border-line bg-paper/95 p-1.5 ps-4 shadow-[var(--shadow-card)]">
            <Search className="size-5 shrink-0 text-beige-deep" strokeWidth={1.8} />
            <input type="search" name="q" placeholder="ابحث عن قطعة أو موديل..." aria-label="البحث في منتجات الجمال" className="min-w-0 flex-1 bg-transparent py-2 text-sm text-ink outline-none placeholder:text-muted" />
            <button type="submit" className="rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-ivory transition-colors hover:bg-ink-soft">بحث</button>
          </form>
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href="/products" size="lg">
              تسوّق الآن
              <ArrowLeft className="size-4" />
            </ButtonLink>
            <ButtonLink href="/track" variant="outline" size="lg">
              تتبع طلبك
            </ButtonLink>
          </div>
          <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-soft">
            <span className="inline-flex items-center gap-1.5"><PackageCheck className="size-4 text-beige-deep" strokeWidth={1.8} /> تأكيد التوفر قبل الدفع</span>
            <span className="inline-flex items-center gap-1.5"><Truck className="size-4 text-beige-deep" strokeWidth={1.8} /> توصيل حسب المنطقة</span>
          </p>
        </div>
        <Suspense fallback={<Skeleton className="h-64 rounded-[2rem] md:h-[25rem]" />}>
          <PromoCard />
        </Suspense>
      </div>
    </section>
  );
}

/** Uses real catalog numbers only: the largest discount currently published. */
async function PromoCard() {
  const [sale, latest] = await Promise.all([
    listProducts({ onSale: true, pageSize: 24 }),
    listProducts({ sort: "newest", pageSize: 4 }),
  ]);
  const best = sale.items.reduce((max, product) => {
    const original = Number(product.price);
    const reduced = Number(product.sale_price);
    return original > 0 && reduced > 0 && reduced < original
      ? Math.max(max, Math.floor((1 - reduced / original) * 100))
      : max;
  }, 0);
  const heroItem = sale.items.find((product) => product.image) ?? latest.items.find((product) => product.image) ?? latest.items[0];
  const destination = heroItem ? "/product/" + heroItem.slug : best > 0 ? "/offers" : "/products";
  return (
    <Link href={destination} className="group relative isolate flex min-h-64 flex-col justify-end overflow-hidden rounded-[2rem] bg-ink p-6 text-ivory shadow-[0_24px_52px_-28px_rgba(29,27,24,0.65)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_30px_64px_-28px_rgba(29,27,24,0.7)] md:min-h-[26rem] md:p-9">
      {heroItem?.image ? (
        <>
          <ProductImage src={heroItem.image} alt={heroItem.image_alt || heroItem.name_ar} sizes="(min-width: 768px) 50vw, 100vw" priority className="transition-transform duration-700 group-hover:scale-[1.05]" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/50 to-ink/10" aria-hidden />
        </>
      ) : (
        <Monogram variant="outline-light" className="pointer-events-none absolute -bottom-20 -end-8 -z-10 w-56 opacity-20 md:w-80" />
      )}
      <div className="relative z-10 max-w-sm">
        <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-beige" dir="ltr">AL JAMAL / THE EDIT</p>
        {best > 0 && (
          <span className="mb-3 inline-flex rounded-full border border-ivory/25 bg-ivory/15 px-3 py-1 text-xs font-bold text-ivory backdrop-blur">
            عروض مختارة حتى {best}% خصم
          </span>
        )}
        <h2 className="text-2xl font-bold leading-snug md:text-3xl">{heroItem?.name_ar ?? "أسلوب يومي بتفاصيل أنيقة"}</h2>
        <p className="mt-2 text-sm leading-7 text-ivory/80">اكتشف القطع المختارة واطلب بمقاسك المفضل.</p>
        <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-ivory px-5 py-2.5 text-sm font-bold text-ink transition-transform duration-200 group-hover:-translate-x-1">
          اكتشف الآن <ArrowLeft className="size-4" strokeWidth={1.8} />
        </span>
      </div>
    </Link>
  );
}

async function Categories() {
  const categories = await getCategories();
  if (!categories.length) return null;
  return (
    <>
      <ul className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:hidden">
        {categories.map((c) => (
          <li key={c.id} className="snap-start">
            <CategoryCircle slug={c.slug} name={c.name_ar} image={c.image_url} />
          </li>
        ))}
      </ul>
      <div className="hidden grid-cols-3 gap-5 md:grid">
        {categories.map((c) => (
          <CategoryTile key={c.id} slug={c.slug} name={c.name_ar} count={c.product_count} image={c.image_url} />
        ))}
      </div>
    </>
  );
}

async function ProductsRow({ kind, carousel = false }: { kind: "featured" | "new" | "sale"; carousel?: boolean }) {
  const { items } = await listProducts({
    featured: kind === "featured",
    onSale: kind === "sale",
    sort: "newest",
    pageSize: 8,
  });
  if (!items.length) {
    if (kind !== "new") return null;
    return (
      <EmptyState
        title="لا توجد منتجات منشورة بعد"
        description="ستظهر المنتجات هنا بمجرد إضافتها ونشرها من لوحة الإدارة."
      />
    );
  }
  if (carousel) {
    return (
      <>
        <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:hidden">
          {items.map((p, i) => (
            <li key={p.id} className="w-[64%] shrink-0 snap-start"><ProductCard product={p} priority={i < 2} /></li>
          ))}
        </ul>
        <div className="hidden md:block"><ProductGrid products={items} /></div>
      </>
    );
  }
  return <ProductGrid products={items} />;
}

function Section({ title, href, compact = false, children }: { title: string; href?: string; compact?: boolean; children: React.ReactNode }) {
  return (
    <section className={`container-page ${compact ? "py-6 md:py-12" : "py-10 md:py-16"}`}>
      <div className="mb-5 flex items-end justify-between gap-4 md:mb-7">
        <h2 className="text-xl font-extrabold tracking-tight md:text-2xl">{title}</h2>
        {href && (
          <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-beige-deep hover:text-ink">
            عرض الكل <ArrowLeft className="size-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Promises() {
  const items = [
    { icon: PackageCheck, title: "اطلب الآن وادفع لاحقًا", text: "نحجز مقاسك ونثبّت السعر النهائي قبل أن تدفع." },
    { icon: ShieldCheck, title: "تحويل بنكي آمن", text: "تحوّل بعد اعتماد السعر، ونؤكد الدفع بعد التحقق من وصوله." },
    { icon: Truck, title: "توصيل لمحافظات مختارة", text: "الرسوم والمدة تظهر لمنطقتك قبل الدفع." },
    { icon: RotateCcw, title: "استبدال وإرجاع", text: "حسب سياسة كل منتج والموضحة في صفحته." },
  ];
  return (
    <section className="border-y border-line bg-paper">
      <div className="container-page grid grid-cols-2 gap-6 py-10 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex flex-col gap-2">
            <Icon className="size-6 text-beige-deep" strokeWidth={1.5} />
            <h3 className="text-sm font-bold">{title}</h3>
            <p className="text-xs leading-6 text-muted">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <Suspense fallback={null}>
        <CategoryChips />
      </Suspense>
      <Hero />
      <Section title="وصل حديثًا" href="/products">
        <Suspense fallback={<ProductGridSkeleton count={4} />}>
          <ProductsRow kind="new" />
        </Suspense>
      </Section>
      <Section title="تسوّق حسب الفئة" compact>
        <Suspense fallback={<div className="flex gap-4"><Skeleton className="size-20 rounded-full" /><Skeleton className="size-20 rounded-full" /><Skeleton className="size-20 rounded-full" /></div>}>
          <Categories />
        </Suspense>
      </Section>
      <Suspense fallback={null}>
        <FeaturedSection />
      </Suspense>
      <Promises />
      <Suspense fallback={null}>
        <SaleSection />
      </Suspense>
    </>
  );
}

async function FeaturedSection() {
  const { total } = await listProducts({ featured: true, pageSize: 1 });
  if (!total) return null;
  return (
    <Section title="مختارات JAMAL" href="/products">
      <ProductsRow kind="featured" carousel />
    </Section>
  );
}

async function SaleSection() {
  const { total } = await listProducts({ onSale: true, pageSize: 1 });
  if (!total) return null;
  return (
    <Section title="العروض والتخفيضات" href="/offers">
      <ProductsRow kind="sale" carousel />
    </Section>
  );
}

async function CategoryChips() {
  const categories = await getCategories();
  return (
    <nav aria-label="فئات سريعة" className="border-b border-line bg-paper md:hidden">
      <ul className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
        <li><Link href="/products" className="block whitespace-nowrap rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-ivory">الكل</Link></li>
        <li><Link href="/offers" className="block whitespace-nowrap rounded-full bg-danger/10 px-4 py-1.5 text-sm font-semibold text-danger">العروض</Link></li>
        {categories.map((c) => (
          <li key={c.id}><Link href={`/category/${c.slug}`} className="block whitespace-nowrap rounded-full border border-line px-4 py-1.5 text-sm text-ink-soft">{c.name_ar}</Link></li>
        ))}
      </ul>
    </nav>
  );
}
