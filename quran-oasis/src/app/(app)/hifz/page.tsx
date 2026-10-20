import { BookMarked } from "lucide-react";
import type { Metadata } from "next";
import { HifzView } from "@/components/hifz/HifzView";
import { PageHeader } from "@/components/ui/States";

export const metadata: Metadata = {
  title: "الحفظ والمراجعة",
  description: "نظّم حفظك للقرآن الكريم: سجّل المقاطع، ودوّن ملاحظاتك، واعرف مواعيد مراجعتها.",
  robots: { index: false },
};

export default function HifzPage() {
  return (
    <>
      <PageHeader
        title="الحفظ والمراجعة"
        subtitle="أداة لتنظيم حفظك ومراجعته — التحقق من صحة الحفظ يكون بالتسميع على معلّم"
        icon={<BookMarked className="h-6 w-6" aria-hidden="true" />}
      />
      <HifzView />
    </>
  );
}
