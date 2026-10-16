import { Suspense } from "react";
import { ArrowLeft, PackageCheck, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { getCategories, getStoreSettings, listProducts } from "@/lib/data/catalog";
import { ProductGrid } from "@/components/product/ProductCard";
import { CategoryTile } from "@/components/catalog/CategoryTile";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, ProductGridSkeleton, Skeleton } from "@/components/ui/States";
import Link from "next/link";
import { Monogram } from "@/components/ui/Logo";

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line bg-paper">
      <div className="container-page grid items-center gap-10 py-14 md:grid-cols-2 md:py-24">
        <div>
          <p className="eyebrow mb-4">مجموعة الموسم</p>
          <h1 className="text-[2.1rem] font-bold leading-[1.35] md:text-5xl md:leading-[1.3]">
            أناقة هادئة
            <br />
            <span className="text-beige-deep">لكل يوم.</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-8 text-muted">
            قطع مختارة بعناية للنساء والرجال والأطفال، من الملابس إلى الأحذية والحقائب والإكسسوارات.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/products" size="lg">
              تسوّق الآن
              <ArrowLeft className="size-4" />
            </ButtonLink>
            <ButtonLink href="/offers" variant="outline" size="lg">
              العروض
            </ButtonLink>
          </div>
        </div>
        <div className="relative mx-auto aspect-[4/5] w-full max-w-[17rem] sm:max-w-sm md:max-w-md" aria-hidden>
          <div className="absolute inset-0 -translate-x-3 translate-y-3 md:-translate-x-4 md:translate-y-4 rounded-[var(--radius-card)] border border-beige" />
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[var(--radius-card)] bg-sand">
            <Monogram variant="outline" className="w-[38%]" />
            <span className="mt-6 font-display text-3xl tracking-[0.45em] text-ink ps-[0.45em] md:text-4xl" dir="ltr">JAMAL</span>
            <span className="mt-2 text-xs tracking-[0.3em] text-beige-deep">منصة الجمال</span>
          </div>
        </div>
      </div>
    </section>
  );
}

async function Categories() {
  const categories = await getCategories();
  if (!categories.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
      {categories.map((c) => (
        <CategoryTile key={c.id} slug={c.slug} name={c.name_ar} count={c.product_count} image={c.image_url} />
      ))}
    </div>
  );
}

async function ProductsRow({ kind }: { kind: "featured" | "new" | "sale" }) {
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
  return <ProductGrid products={items} />;
}

function Section({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="container-page py-12 md:py-16">
      <div className="mb-7 flex items-end justify-between gap-4">
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

async function Promises() {
  const s = await getStoreSettings();
  const items = [
    { icon: Truck, title: "شحن لدول مختارة", text: "تكلفة الشحن والمدة التقديرية تظهر قبل تأكيد الطلب." },
    s?.cod_enabled
      ? { icon: PackageCheck, title: "الدفع عند الاستلام", text: "متاح فقط في الدول والمنتجات المؤكدة." }
      : { icon: PackageCheck, title: "تأكيد قبل التنفيذ", text: "نتواصل معك لتأكيد طلبك قبل تجهيزه." },
    { icon: RotateCcw, title: "استبدال وإرجاع", text: "حسب سياسة كل منتج والموضحة في صفحته." },
    { icon: ShieldCheck, title: "بياناتك محمية", text: "لا نخزن بيانات بطاقات ولا نبيع بياناتك." },
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
      <Section title="تسوّق حسب الفئة">
        <Suspense fallback={<div className="grid grid-cols-2 gap-3 md:grid-cols-3"><Skeleton className="aspect-[4/5]" /><Skeleton className="aspect-[4/5]" /><Skeleton className="aspect-[4/5]" /></div>}>
          <Categories />
        </Suspense>
      </Section>
      <Suspense fallback={null}>
        <Promises />
      </Suspense>
      <Suspense fallback={null}>
        <FeaturedSection />
      </Suspense>
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
      <ProductsRow kind="featured" />
    </Section>
  );
}

async function SaleSection() {
  const { total } = await listProducts({ onSale: true, pageSize: 1 });
  if (!total) return null;
  return (
    <Section title="العروض والتخفيضات" href="/offers">
      <ProductsRow kind="sale" />
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
