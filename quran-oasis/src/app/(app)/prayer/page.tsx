import { Clock } from "lucide-react";
import type { Metadata } from "next";
import { PrayerView } from "@/components/prayer/PrayerView";
import { PageHeader } from "@/components/ui/States";

export const metadata: Metadata = {
  title: "مواقيت الصلاة",
  description: "مواقيت الصلاة محسوبة على جهازك بحسب مدينتك وطريقة الحساب المعتمدة في بلدك، مع عدّ تنازلي للصلاة القادمة.",
  alternates: { canonical: "/prayer" },
};

export default function PrayerPage() {
  return (
    <>
      <PageHeader title="مواقيت الصلاة" subtitle="محسوبة على جهازك — تعمل دون إنترنت" icon={<Clock className="h-6 w-6" aria-hidden="true" />} />
      <PrayerView />
    </>
  );
}
