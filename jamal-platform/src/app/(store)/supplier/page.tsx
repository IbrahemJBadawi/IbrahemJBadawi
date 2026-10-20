import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PackagePlus } from "lucide-react";
import { requireSupplier } from "@/lib/auth";
import { supplierOrders, supplierProducts } from "@/lib/data/supplier";
import { ButtonLink } from "@/components/ui/Button";
import { Notice, Skeleton } from "@/components/ui/States";

export const metadata: Metadata = { title: "لوحة المورد", robots: { index: false } };

async function Content({ searchParams }: { searchParams: PageProps<"/supplier">["searchParams"] }) {
  const sp = await searchParams;
  const { supplier } = await requireSupplier();
  const [products, orders] = await Promise.all([supplierProducts(supplier.id), supplierOrders(supplier.id)]);
  const stats = [
    { label: "منتجات منشورة", value: products.filter((p) => p.status === "published").length },
    { label: "قيد المراجعة", value: products.filter((p) => p.status !== "published" && p.review_status === "pending").length },
    { label: "تحتاج تعديل", value: products.filter((p) => p.review_status === "changes_requested").length },
    { label: "طلبات للتجهيز", value: orders.filter((o) => ["sent_to_supplier", "supplier_accepted", "preparing"].includes(o.status)).length },
  ];
  return (
    <div className="space-y-6">
      {sp.welcome === "1" && <Notice tone="success">أهلًا بك في متجر الجمال! وصلنا طلبك، وسنتواصل معك قريبًا. يمكنك البدء بإضافة منتجاتك من الآن.</Notice>}
      <div>
        <h1 className="text-2xl font-bold">{supplier.name}</h1>
        {supplier.agreement_status === "approved" ? (
          <p className="mt-1 text-sm text-success">متجرك معتمد ✓ منتجاتك تُنشر بعد مراجعة سريعة.</p>
        ) : supplier.agreement_status === "suspended" ? (
          <p className="mt-1 text-sm text-danger">الحساب موقوف مؤقتًا. تواصل مع فريق المنصة.</p>
        ) : (
          <p className="mt-1 text-sm text-muted">نراجع طلب انضمامك الآن. أضف منتجاتك لنراجعها معًا ونسرّع الاعتماد.</p>
        )}
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <li key={s.label} className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted">{s.label}</p>
          </li>
        ))}
      </ul>
      {products.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-line p-8 text-center">
          <PackagePlus className="mx-auto size-8 text-beige-deep" strokeWidth={1.4} />
          <p className="mt-3 font-semibold">أضف أول منتج لك</p>
          <p className="mt-1 text-sm text-muted">صور واضحة، وصف قصير، المقاسات والألوان، وسعرك. الباقي علينا.</p>
          <ButtonLink href="/supplier/products/new" className="mt-5">إضافة منتج</ButtonLink>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/supplier/products/new">إضافة منتج</ButtonLink>
          <ButtonLink href="/supplier/orders" variant="outline">الطلبات</ButtonLink>
        </div>
      )}
      <p className="text-xs text-muted">أسئلة؟ <Link href="/support" className="underline">تواصل مع فريق المنصة</Link>.</p>
    </div>
  );
}

export default function Page(props: PageProps<"/supplier">) {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}
