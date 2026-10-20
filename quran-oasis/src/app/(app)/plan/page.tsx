import { CalendarCheck } from "lucide-react";
import type { Metadata } from "next";
import { PlanView } from "@/components/plan/PlanView";
import { PageHeader } from "@/components/ui/States";
import { getAdhkarContent } from "@/lib/content";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "الورد والخطة اليومية",
  description: "حدد هدفك اليومي، واختر مهامك، وأنشئ خطة ختمة بالمدة التي تناسبك.",
  robots: { index: false },
};

export default async function PlanPage() {
  const { adhkar, categories } = await getAdhkarContent();
  return (
    <>
      <PageHeader
        title="الورد والخطة اليومية"
        subtitle="خطط مرنة واختيارية — عدّلها أو أوقفها متى شئت"
        icon={<CalendarCheck className="h-6 w-6" aria-hidden="true" />}
      />
      <PlanView adhkar={adhkar} categories={categories} />
    </>
  );
}
