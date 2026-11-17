import type { Metadata } from "next";
import { KhaliliView } from "@/components/khalili/KhaliliView";

export const metadata: Metadata = { title: "خليلي", description: "تحديات ثنائية ودّية في قراءة القرآن والحفظ والمراجعة.", robots: { index: false } };

export default function KhaliliPage() {
  return <KhaliliView />;
}
