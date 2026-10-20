import { Award } from "lucide-react";
import type { Metadata } from "next";
import { StatsView } from "@/components/dashboard/StatsView";
import { PageHeader } from "@/components/ui/States";
import { getAdhkarContent } from "@/lib/content";

export const revalidate = 300;

export const metadata: Metadata = { title: "الإنجازات والإحصائيات", robots: { index: false } };

export default async function StatsPage() {
  const { adhkar, categories } = await getAdhkarContent();
  return (
    <>
      <PageHeader title="الإنجازات والإحصائيات" subtitle="رحلتك مع القرآن — لك وحدك، دون مقارنة بأحد" icon={<Award className="h-6 w-6" aria-hidden="true" />} />
      <StatsView adhkar={adhkar} categories={categories} />
    </>
  );
}
