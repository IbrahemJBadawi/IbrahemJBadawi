import { Compass } from "lucide-react";
import type { Metadata } from "next";
import { QiblaView } from "@/components/prayer/QiblaView";
import { PageHeader } from "@/components/ui/States";

export const metadata: Metadata = { title: "اتجاه القبلة", description: "حدد اتجاه القبلة من موقعك بدقة، محسوبًا على جهازك.", alternates: { canonical: "/qibla" } };

export default function QiblaPage() {
  return (
    <>
      <PageHeader title="اتجاه القبلة" icon={<Compass className="h-6 w-6" aria-hidden="true" />} />
      <QiblaView />
    </>
  );
}
