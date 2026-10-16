import { Leaf } from "lucide-react";
import type { Metadata } from "next";
import { OasisView } from "@/components/oasis/OasisView";
import { PageHeader } from "@/components/ui/States";
import { getOasisMoments } from "@/lib/content";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "لحظة واحة",
  description: "آية كل يوم مع معناها من تفسير معتمد، وسؤال للتفكّر، ومساحة خاصة لخواطرك.",
  alternates: { canonical: "/oasis" },
};

export default async function OasisPage() {
  const moments = await getOasisMoments();
  return (
    <>
      <PageHeader title="لحظة واحة" subtitle="دقيقتان من السكينة مع آية اليوم" icon={<Leaf className="h-6 w-6" aria-hidden="true" />} />
      <OasisView moments={moments} />
    </>
  );
}
