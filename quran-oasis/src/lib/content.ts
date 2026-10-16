import "server-only";
/**
 * مصدر المحتوى العام (الأذكار، لحظات واحة، الدروس):
 * - إن كانت Supabase مهيأة: يُقرأ المحتوى المنشور من قاعدة البيانات (يديره فريق المحتوى من لوحة الإدارة).
 * - وإلا، أو عند تعذّر الاتصال: يُستخدم المحتوى الافتتاحي المضمّن في المشروع.
 */
import { ADHKAR, DHIKR_CATEGORIES, type Dhikr, type DhikrCategory } from "@/content/adhkar";
import { LEARNING_PATHS, type LearningPath } from "@/content/learning";
import MOMENTS_JSON from "@/content/oasis-moments.json";
import type { AdhkarContent, LearningContent, OasisMoment } from "@/content/types";
import { getPublicSupabase } from "@/lib/supabase/server";

const BUNDLED_MOMENTS: OasisMoment[] = (MOMENTS_JSON as OasisMoment[]).map((m) => ({ ...m, publishDate: null }));

export async function getAdhkarContent(): Promise<AdhkarContent> {
  const db = getPublicSupabase();
  if (db) {
    const [cats, items] = await Promise.all([
      db.from("adhkar_categories").select("id, title, description, icon, sort").eq("active", true).order("sort"),
      db
        .from("adhkar")
        .select("id, category_id, title, body, quran, repeat, source_text, virtue, note, sort")
        .eq("active", true)
        .order("sort"),
    ]);
    if (!cats.error && !items.error && cats.data.length) {
      return {
        origin: "database",
        categories: cats.data.map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description ?? "",
          icon: c.icon,
        })) as DhikrCategory[],
        adhkar: items.data.map((d) => ({
          id: d.id,
          category: d.category_id,
          title: d.title ?? undefined,
          text: d.body ?? undefined,
          quran: d.quran ?? undefined,
          repeat: d.repeat,
          source: d.source_text,
          virtue: d.virtue ?? undefined,
          note: d.note ?? undefined,
          order: d.sort,
        })) as Dhikr[],
      };
    }
    if (cats.error || items.error) console.error("[content] adhkar fallback:", cats.error?.message ?? items.error?.message);
  }
  return { origin: "bundled", categories: DHIKR_CATEGORIES, adhkar: ADHKAR };
}

export async function getOasisMoments(): Promise<OasisMoment[]> {
  const db = getPublicSupabase();
  if (db) {
    const { data, error } = await db
      .from("oasis_moments")
      .select("id, surah, ayah_from, ayah_to, meaning, meaning_source, reflection, action, publish_date")
      .eq("status", "published")
      .order("id");
    if (!error) {
      return data.map((m) => ({
        id: m.id,
        surah: m.surah,
        ayahFrom: m.ayah_from,
        ayahTo: m.ayah_to,
        meaning: m.meaning,
        meaningSource: m.meaning_source,
        reflection: m.reflection,
        action: m.action,
        publishDate: m.publish_date,
      }));
    }
    console.error("[content] moments fallback:", error.message);
  }
  return BUNDLED_MOMENTS;
}

export async function getLearningContent(): Promise<LearningContent> {
  const db = getPublicSupabase();
  if (db) {
    const [paths, lessons] = await Promise.all([
      db.from("learning_paths").select("id, title, description, goals, level, color, sort").eq("active", true).order("sort"),
      db
        .from("lessons")
        .select("path_id, id, title, summary, minutes, body, sources, sort")
        .eq("active", true)
        .order("sort"),
    ]);
    if (!paths.error && !lessons.error && paths.data.length) {
      return {
        origin: "database",
        paths: paths.data.map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description ?? "",
          goals: p.goals ?? [],
          level: p.level,
          color: p.color,
          lessons: lessons.data
            .filter((l) => l.path_id === p.id)
            .map((l) => ({
              id: l.id,
              title: l.title,
              summary: l.summary ?? "",
              minutes: l.minutes,
              body: l.body,
              sources: l.sources ?? [],
            })),
        })) as LearningPath[],
      };
    }
    if (paths.error || lessons.error) console.error("[content] learning fallback:", paths.error?.message ?? lessons.error?.message);
  }
  return { origin: "bundled", paths: LEARNING_PATHS };
}
