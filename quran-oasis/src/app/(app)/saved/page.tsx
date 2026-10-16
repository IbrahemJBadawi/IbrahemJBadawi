import { Heart } from "lucide-react";
import type { Metadata } from "next";
import { SavedView } from "@/components/quran/SavedView";
import { PageHeader } from "@/components/ui/States";

export const metadata: Metadata = { title: "المحفوظات", robots: { index: false } };

export default function SavedPage() {
  return (
    <>
      <PageHeader title="المحفوظات" subtitle="آياتك المفضلة وعلامتك المرجعية" icon={<Heart className="h-6 w-6" aria-hidden="true" />} />
      <SavedView />
    </>
  );
}
