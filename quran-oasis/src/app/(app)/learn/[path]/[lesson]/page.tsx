import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonBody } from "@/components/learn/LessonBody";
import { LessonView } from "@/components/learn/LearnViews";
import { LEARNING_PATHS } from "@/content/learning";
import { getLearningContent } from "@/lib/content";

export const revalidate = 300;

export function generateStaticParams() {
  return LEARNING_PATHS.flatMap((p) => p.lessons.map((l) => ({ path: p.id, lesson: l.id })));
}

async function find(pathId: string, lessonId: string) {
  const p = (await getLearningContent()).paths.find((x) => x.id === pathId);
  const i = p?.lessons.findIndex((l) => l.id === lessonId) ?? -1;
  return p && i >= 0 ? { p, i } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ path: string; lesson: string }> }): Promise<Metadata> {
  const { path, lesson } = await params;
  const r = await find(path, lesson);
  if (!r) return {};
  const l = r.p.lessons[r.i];
  return { title: `${l.title} — ${r.p.title}`, description: l.summary, alternates: { canonical: `/learn/${path}/${lesson}` } };
}

export default async function LessonPage({ params }: { params: Promise<{ path: string; lesson: string }> }) {
  const { path, lesson } = await params;
  const r = await find(path, lesson);
  if (!r) notFound();
  const l = r.p.lessons[r.i];
  return (
    <LessonView path={r.p} index={r.i}>
      <LessonBody body={l.body} />
    </LessonView>
  );
}
