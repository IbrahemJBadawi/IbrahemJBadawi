import { CircleDot } from "lucide-react";
import type { Metadata } from "next";
import { TasbihView } from "@/components/adhkar/TasbihView";
import { PageHeader } from "@/components/ui/States";

export const metadata: Metadata = { title: "المسبحة", description: "مسبحة إلكترونية هادئة تحفظ عدّك على جهازك.", alternates: { canonical: "/tasbih" } };

export default function TasbihPage() {
  return (
    <>
      <PageHeader title="المسبحة" icon={<CircleDot className="h-6 w-6" aria-hidden="true" />} />
      <TasbihView />
    </>
  );
}
