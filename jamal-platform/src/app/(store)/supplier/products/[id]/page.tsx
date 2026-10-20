import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireSupplier } from "@/lib/auth";
import { listCategoryOptions, supplierProduct } from "@/lib/data/supplier";
import { SupplierProductForm } from "@/components/supplier/ProductForm";
import { ProductStatusChip } from "@/components/supplier/StatusChip";
import { Notice, Skeleton } from "@/components/ui/States";

export const metadata: Metadata = { title: "تعديل منتج", robots: { index: false } };

async function Content({ params, searchParams }: PageProps<"/supplier/products/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { supplier } = await requireSupplier();
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [p, categories] = await Promise.all([supplierProduct(supplier.id, id), listCategoryOptions()]);
  if (!p) notFound();
  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{p.name_ar}</h1>
        <ProductStatusChip status={p.status} review={p.review_status} />
      </div>
      {sp.sent === "1" && <Notice tone="success">وصلنا منتجك! نراجعه ونبلغك فور نشره.</Notice>}
      {p.review_status === "changes_requested" && p.review_note && <Notice tone="warning">ملاحظة الفريق: {p.review_note}</Notice>}
      <SupplierProductForm p={p} categories={categories} />
      <Link href="/supplier/products" className="inline-block text-sm text-muted underline">العودة إلى منتجاتي</Link>
    </div>
  );
}

export default function Page(props: PageProps<"/supplier/products/[id]">) {
  return <Suspense fallback={<Skeleton className="h-96 w-full" />}><Content {...props} /></Suspense>;
}
