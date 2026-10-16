import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";

export const metadata: Metadata = { title: "الأسئلة الشائعة", alternates: { canonical: "/faq" } };

export default function FaqPage() {
  return <ContentPage slug="faq" />;
}
