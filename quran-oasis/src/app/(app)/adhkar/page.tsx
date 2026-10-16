import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { AdhkarHome } from "@/components/adhkar/AdhkarHome";
import { PageHeader } from "@/components/ui/States";
import { getAdhkarContent } from "@/lib/content";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "الأذكار والأدعية",
  description: "أذكار الصباح والمساء والنوم والاستيقاظ وبعد الصلاة، مع عدّاد للتكرار وتخريج كل ذكر من مصادره.",
  alternates: { canonical: "/adhkar" },
};

export default async function AdhkarPage() {
  const content = await getAdhkarContent();
  return (
    <>
      <PageHeader
        title="الأذكار والأدعية"
        subtitle="من القرآن الكريم وصحيح السنة، مع ذكر المصدر لكل ذكر"
        icon={<Sparkles className="h-6 w-6" aria-hidden="true" />}
      />
      <AdhkarHome categories={content.categories} adhkar={content.adhkar} />
    </>
  );
}
