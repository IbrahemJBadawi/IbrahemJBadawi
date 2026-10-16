import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PathDetail } from "@/components/learn/LearnViews";
import { LEARNING_PATHS } from "@/content/learning";
import { getLearningContent } from "@/lib/content";

export const revalidate = 300;

export function generateStaticParams() {
  return LEARNING_PATHS.map((p) => ({ path: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ path: string }> }): Promise<Metadata> {
  const { path } = await params;
  const p = (await getLearningContent()).paths.find((x) => x.id === path);
  return p ? { title: p.title, description: p.description, alternates: { canonical: `/learn/${p.id}` } } : {};
}

export default async function PathPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  const p = (await getLearningContent()).paths.find((x) => x.id === path);
  if (!p) notFound();
  return <PathDetail path={p} />;
}
