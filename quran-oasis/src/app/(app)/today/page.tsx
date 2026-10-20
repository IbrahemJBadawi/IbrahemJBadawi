import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { getAdhkarContent, getOasisMoments } from "@/lib/content";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "يومي",
  description: "لوحتك اليومية: وردك من القرآن، وأذكارك، ولحظة واحة، ومهام يومك.",
  robots: { index: false },
};

export default async function TodayPage() {
  const [{ adhkar, categories }, moments] = await Promise.all([getAdhkarContent(), getOasisMoments()]);
  return <Dashboard adhkar={adhkar} categories={categories} moments={moments} />;
}
