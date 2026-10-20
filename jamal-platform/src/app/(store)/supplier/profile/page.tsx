import type { Metadata } from "next";
import { Suspense } from "react";
import { requireSupplier } from "@/lib/auth";
import { listGovernorates } from "@/lib/data/supplier";
import { updateSupplierProfileAction } from "@/lib/actions/supplier";
import { ActionForm } from "@/components/forms/ActionForm";
import { SupplierProfileFields } from "@/components/supplier/ProfileFields";
import { Field, Input } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/States";

export const metadata: Metadata = { title: "بيانات المتجر", robots: { index: false } };

async function Form() {
  const { supplier } = await requireSupplier();
  const governorates = await listGovernorates();
  return (
    <ActionForm action={updateSupplierProfileAction} submitLabel="حفظ البيانات" className="space-y-5">
      <SupplierProfileFields s={supplier} governorates={governorates} />
      <Field label="مناطق التوصيل لديك (اختياري)"><Input name="coverage" maxLength={300} defaultValue={supplier.coverage_areas ?? ""} /></Field>
    </ActionForm>
  );
}

export default function Page() {
  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold">بيانات المتجر</h1>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}><Form /></Suspense>
    </div>
  );
}
