import type { Metadata } from "next";
import { Suspense } from "react";
import { requireSupplier } from "@/lib/auth";
import { listCategoryOptions } from "@/lib/data/supplier";
import { SupplierProductForm } from "@/components/supplier/ProductForm";
import { Skeleton } from "@/components/ui/States";

export const metadata: Metadata = { title: "منتج جديد", robots: { index: false } };

async function Form() {
  await requireSupplier();
  return <SupplierProductForm categories={await listCategoryOptions()} />;
}

export default function Page() {
  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold">منتج جديد</h1>
      <p className="text-sm text-muted">نراجع المنتج ونحدد سعر البيع للعميل، ثم ننشره ونبلغك بإشعار.</p>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}><Form /></Suspense>
    </div>
  );
}
