import { BookOpen } from "lucide-react";
import type { Metadata } from "next";
import { SurahBrowser } from "@/components/quran/SurahBrowser";
import { PageHeader } from "@/components/ui/States";

export const metadata: Metadata = {
  title: "القرآن الكريم",
  description: "تصفح سور القرآن الكريم الـ114 بالرسم العثماني من مصحف المدينة النبوية برواية حفص عن عاصم.",
  alternates: { canonical: "/quran" },
};

export default function QuranIndexPage() {
  return (
    <>
      <PageHeader
        title="القرآن الكريم"
        subtitle="مصحف المدينة النبوية — رواية حفص عن عاصم"
        icon={<BookOpen className="h-6 w-6" aria-hidden="true" />}
      />
      <SurahBrowser />
    </>
  );
}
