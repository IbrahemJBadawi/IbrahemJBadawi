import { GraduationCap } from "lucide-react";
import type { Metadata } from "next";
import { PathsList } from "@/components/learn/LearnViews";
import { PageHeader } from "@/components/ui/States";
import { getLearningContent } from "@/lib/content";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "التعلّم والدروس",
  description: "مسارات تعليمية قصيرة في أساسيات التجويد والقراءة الصحيحة وخطط الحفظ وتدبّر القرآن.",
  alternates: { canonical: "/learn" },
};

export default async function LearnPage() {
  const { paths } = await getLearningContent();
  return (
    <>
      <PageHeader
        title="التعلّم والدروس"
        subtitle="دروس قصيرة ومرتبة، تُكمل التلقي من المعلّم ولا تغني عنه"
        icon={<GraduationCap className="h-6 w-6" aria-hidden="true" />}
      />
      <PathsList paths={paths} />
    </>
  );
}
