import { Suspense } from "react";
import { ArrowLeft, PackageCheck, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { getCategories, listProducts } from "@/lib/data/catalog";
import { ProductCard, ProductGrid } from "@/components/product/ProductCard";
import { CategoryCircle, CategoryTile } from "@/components/catalog/CategoryTile";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, ProductGridSkeleton, Skeleton } from "@/components/ui/States";
import Link from "next/link";
import { Monogram } from "@/components/ui/Logo";

function Hero() {
  return (
    <section className="relative overflow-hidden bg-ivory">
      <div className="container-page grid items-center gap-8 pt-8 pb-10 md:grid-cols-2 md:gap-12 md:py-20">
        <div>
          <p className="eyebrow mb-3">مجموعة الموسم</p>
          <h1 className="text-[2.5rem] font-extrabold leading-[1.3] tracking-tight md:text-6xl md:leading-[1.25]">
            أناقة{" "}
            <span className="inline-block -rotate-1 rounded-full bg-ink px-4 pb-1 text-ivory md:px-6">هادئة</span>
            <br />
            <span className="text-beige-deep">لكل يوم.</span>
          </h1>
          <p className="mt-4 max-w-md text-[0.95rem] leading-8 text-muted">
            قطع يومية مختارة من موردين محليين في فلسطين. اطلب الآن وادفع بعد تثبيت طلبك.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href="/products" size="lg">
              تسوّق الآن
              <ArrowLeft className="size-4" />
            </ButtonLink>
            <ButtonLink href="/track" variant="outline" size="lg">
              تتبع طلبك
            </ButtonLink>
          </div>
        </div>
        <Suspense fallback={<Skeleton className="h-56 rounded-[2rem] md:h-80" />}>
          <PromoCard />
        </Suspense>
      </div>
    </section>
  );
}

/** Uses real catalog numbers only: the largest discount currently published. */
async function PromoCard() {
  const { items } = await listProducts({ onSale: true, pageSize: 60 });
  const best = items.reduce((m, p) => {
    const price = Number(p.price);
    const sale = Number(p.sale_price);
    return price > 0 && sale > 0 && sale < price ? Math.max(m, Math.floor((1 - sale / price) * 100)) : m;
  }, 0);
  const hasOffers = best > 0;
  return (
    <Link
      href={hasOffers ? "/offers" : "/products"}
      className="group relative isolate block overflow-hidden rounded-[2rem] bg-ink p-6 text-ivory shadow-[0_24px_48px_-24px_rgba(29,27,24,0.7)] md:p-10"
    >
      <Monogram variant="outline-light" className="pointer-events-none absolute -bottom-12 -end-10 -z-10 w-40 opacity-20 md:w-60" />
      <p className="text-xs tracking-[0.3em] text-beige">{hasOffers ? "عروض الموسم" : "جديد JAMAL"}</p>
      {hasOffers ? (
        <p className="mt-3 text-lg font-semibold">
          خصم حتى <span className="mt-1 block font-display text-7xl leading-none tracking-tight text-ivory md:text-8xl"><bdi>{best}%</bdi></span>
        </p>
      ) : (
        <p className="mt-3 max-w-[14rem] text-2xl font-bold leading-snug">قطع يومية مختارة بعناية</p>
      )}
      <p className="mt-3 max-w-[15rem] text-xs leading-6 text-ivory/70">على قطع مختارة من المجموعة.</p>
      <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-ivory px-5 py-2.5 text-sm font-bold text-ink transition-transform group-hover:-translate-x-1">
        {hasOffers ? "تسوّق العروض" : "اكتشف المجموعة"} <ArrowLeft className="size-4" />
      </span>
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
        <h2 className="text-xl font-bold md:text-2xl">{title}</h2>
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
      <Section title="تسوّق حسب الفئة" compact>
        <Suspense fallback={<div className="flex gap-4"><Skeleton className="size-20 rounded-full" /><Skeleton className="size-20 rounded-full" /><Skeleton className="size-20 rounded-full" /></div>}>
          <Categories />
        </Suspense>
      </Section>
      <Suspense fallback={null}>
        <FeaturedSection />
      </Suspense>
      <Promises />
      <Section title="وصل حديثًا" href="/products">
        <Suspense fallback={<ProductGridSkeleton count={4} />}>
          <ProductsRow kind="new" />
        </Suspense>
      </Section>
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
