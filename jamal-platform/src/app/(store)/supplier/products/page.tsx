import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireSupplier } from "@/lib/auth";
import { supplierProducts } from "@/lib/data/supplier";
import { formatMoney } from "@/lib/money";
import { ProductImage } from "@/components/product/ProductImage";
import { ProductStatusChip } from "@/components/supplier/StatusChip";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/States";

export const metadata: Metadata = { title: "منتجاتي", robots: { index: false } };

async function List() {
  const { supplier } = await requireSupplier();
  const items = await supplierProducts(supplier.id);
  if (!items.length) return <p className="rounded-[var(--radius-card)] border border-dashed border-line p-8 text-center text-sm text-muted">لم تضف منتجات بعد.</p>;
  return (
    <ul className="space-y-2">
      {items.map((p) => (
        <li key={p.id}>
          <Link href={`/supplier/products/${p.id}`} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-paper p-3 hover:bg-sand/50">
            <span className="relative block aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-xl bg-sand"><ProductImage src={p.image} alt="" sizes="56px" /></span>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-1 text-sm font-semibold">{p.name_ar}</span>
              <span className="mt-0.5 block text-xs text-muted">سعرك: {p.cost ? formatMoney(p.cost, "ILS") : "—"} · {p.availability === "available" ? "متوفر" : "غير متوفر"}</span>
              {p.review_status === "changes_requested" && p.review_note && <span className="mt-1 block text-xs text-danger">{p.review_note}</span>}
            </span>
            <ProductStatusChip status={p.status} review={p.review_status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function Page() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">منتجاتي</h1>
        <ButtonLink href="/supplier/products/new" size="sm">إضافة منتج</ButtonLink>
      </div>
      <Suspense fallback={<Skeleton className="h-60 w-full" />}><List /></Suspense>
    </div>
  );
}
