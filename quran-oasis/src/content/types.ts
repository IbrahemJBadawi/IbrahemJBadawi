import type { Dhikr, DhikrCategory } from "./adhkar";
import type { LearningPath } from "./learning";

export interface OasisMoment {
  id: string;
  surah: number;
  ayahFrom: number;
  ayahTo: number;
  meaning?: string | null;
  meaningSource?: string | null;
  reflection?: string | null;
  action?: string | null;
  /** تاريخ النشر المجدول YYYY-MM-DD، أو null إن كانت ضمن المكتبة الدورية */
  publishDate?: string | null;
}

export interface AdhkarContent {
  categories: DhikrCategory[];
  adhkar: Dhikr[];
  origin: "database" | "bundled";
}

export interface LearningContent {
  paths: LearningPath[];
  origin: "database" | "bundled";
}
