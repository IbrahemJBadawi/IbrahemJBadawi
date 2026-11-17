import type { Metadata } from "next";
import { KhalwaView } from "@/components/khalwa/KhalwaView";

export const metadata: Metadata = { title: "الخلوة", description: "مساحة خاصة للذكر والقرآن والتوبة والدعاء والتدبّر والخشوع.", robots: { index: false } };

export default function KhalwaPage() {
  return <KhalwaView />;
}
