import type { MetadataRoute } from "next";
import { DHIKR_CATEGORIES } from "@/content/adhkar";
import { LEARNING_PATHS } from "@/content/learning";
import { SURAHS } from "@/lib/quran";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const u = (p: string, priority = 0.6) => ({ url: `${SITE.url}${p}`, priority });
  return [
    u("/", 1),
    u("/quran", 0.9),
    ...SURAHS.map((s) => u(`/quran/${s.n}`, 0.8)),
    u("/adhkar", 0.9),
    ...DHIKR_CATEGORIES.map((c) => u(`/adhkar/${c.id}`, 0.8)),
    u("/oasis", 0.7),
    u("/learn", 0.7),
    ...LEARNING_PATHS.flatMap((p) => [u(`/learn/${p.id}`), ...p.lessons.map((l) => u(`/learn/${p.id}/${l.id}`, 0.5))]),
    u("/sources", 0.4),
    u("/privacy", 0.3),
    u("/terms", 0.3),
    u("/contact", 0.3),
  ];
}
