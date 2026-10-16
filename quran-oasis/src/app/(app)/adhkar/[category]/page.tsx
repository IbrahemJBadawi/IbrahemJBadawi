import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DhikrSession } from "@/components/adhkar/DhikrSession";
import { DHIKR_CATEGORIES } from "@/content/adhkar";
import { getAdhkarContent } from "@/lib/content";

export const revalidate = 300;

export function generateStaticParams() {
  return DHIKR_CATEGORIES.map((c) => ({ category: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const { categories } = await getAdhkarContent();
  const c = categories.find((x) => x.id === category);
  if (!c) return {};
  return { title: c.title, description: `${c.title} — ${c.description}`, alternates: { canonical: `/adhkar/${c.id}` } };
}

export default async function AdhkarCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const { categories, adhkar } = await getAdhkarContent();
  const c = categories.find((x) => x.id === category);
  if (!c) notFound();
  const items = adhkar.filter((d) => d.category === c.id).sort((a, b) => a.order - b.order);
  return <DhikrSession category={c} items={items} />;
}
