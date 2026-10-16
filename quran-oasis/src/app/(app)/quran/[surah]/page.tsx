import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Reader } from "@/components/quran/Reader";
import { getSurahMeta, SURAHS, surahTypeLabel } from "@/lib/quran";
import { readSurahText } from "@/lib/quran/server";

export const dynamicParams = false;

export function generateStaticParams() {
  return SURAHS.map((s) => ({ surah: String(s.n) }));
}

export async function generateMetadata({ params }: { params: Promise<{ surah: string }> }): Promise<Metadata> {
  const { surah } = await params;
  const s = getSurahMeta(Number(surah));
  if (!s) return {};
  const type = surahTypeLabel(s.type);
  return {
    title: `سورة ${s.name}`,
    description: `اقرأ سورة ${s.name}${type ? ` (${type})` : ""} — ${s.ayahs} آية — بالرسم العثماني من مصحف المدينة النبوية برواية حفص عن عاصم.`,
    alternates: { canonical: `/quran/${s.n}` },
  };
}

export default async function SurahPage({ params }: { params: Promise<{ surah: string }> }) {
  const { surah } = await params;
  const n = Number(surah);
  const meta = getSurahMeta(n);
  if (!meta) notFound();
  const [text, fatiha] = await Promise.all([readSurahText(n), readSurahText(1)]);
  if (!text || !fatiha) notFound();
  // البسملة تُعرض في أول كل سورة عدا الفاتحة (هي آيتها الأولى) والتوبة
  const basmala = n !== 1 && n !== 9 ? fatiha.ayahs[0].t : null;
  return <Reader key={n} meta={meta} text={text} basmala={basmala} />;
}
