/** Row shapes returned by the database (subset used by the UI). */
export type PublicHalaqa = {
  id: string;
  name: string;
  description: string | null;
  teacher_id: string;
  teacher_name: string;
  teacher_bio?: string | null;
  teacher_verified?: boolean;
  center_id: string | null;
  center_name: string | null;
  is_independent: boolean;
  audience_gender: "male" | "female" | "mixed";
  age_min: number | null;
  age_max: number | null;
  level: "beginner" | "intermediate" | "advanced" | "all";
  max_students: number;
  active_students: number;
  meeting_mode: "in_person" | "remote" | "hybrid";
  location_text: string | null;
  schedule: unknown;
  timezone: string;
  join_policy: "open" | "approval" | "invite_only";
  total_count?: number;
};

export type Halaqa = Omit<PublicHalaqa, "teacher_name" | "center_name" | "active_students" | "total_count"> & {
  status: "draft" | "published" | "completed" | "paused";
  created_at: string;
};

export type Session = {
  id: string;
  halaqa_id: string;
  starts_at: string;
  duration_minutes: number;
  mode: "in_person" | "remote" | "hybrid";
  meeting_url: string | null;
  location_text: string | null;
  topic: string | null;
  status: "scheduled" | "completed" | "cancelled";
};

export type ProgressRecord = {
  id: string;
  student_id: string;
  halaqa_id: string;
  session_id: string | null;
  assignment_id: string | null;
  activity: "new_memorization" | "near_review" | "far_review";
  surah_from: number;
  ayah_from: number;
  surah_to: number;
  ayah_to: number;
  ayah_count: number;
  completion: "completed" | "partial" | "not_completed";
  mastery_score: number | null;
  recitation_score: number | null;
  plan_adherence: "met" | "partial" | "missed" | "no_plan";
  teacher_notes: string | null;
  recorded_on: string;
  status: "draft" | "approved";
  revision: number;
};

export type Assignment = {
  id: string;
  halaqa_id: string;
  student_id: string;
  activity: ProgressRecord["activity"];
  surah_from: number;
  ayah_from: number;
  surah_to: number;
  ayah_to: number;
  ayah_count: number;
  due_on: string | null;
  instructions: string | null;
  status: "assigned" | "completed" | "partially_completed" | "missed" | "cancelled";
};

export type StudentOverview = {
  amount: { new_memorization_ayat: number; review_ayat_period: number; sessions_recorded_period: number };
  mastery_avg: number | null;
  recitation_avg: number | null;
  plan_adherence: Record<string, number>;
  attendance: Record<string, number>;
  errors_by_type: Record<string, number>;
  period_days: number;
};

export type Certificate = {
  id: string;
  serial: string;
  student_id: string;
  halaqa_id: string | null;
  kind: "juz_completion" | "surah_completion" | "khatm" | "attendance" | "other";
  title: string;
  title_en: string | null;
  description: string | null;
  issued_on: string;
  show_name_publicly: boolean;
  revoked_at: string | null;
};
