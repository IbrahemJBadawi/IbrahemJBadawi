"use client";

import { RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { QuranPassage } from "@/components/quran/QuranPassage";
import { Button } from "@/components/ui/Button";
import { Badge, Card, CardTitle } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Input, Segmented, Select } from "@/components/ui/Form";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSurahMeta, isValidRef, SURAHS } from "@/lib/quran";
import { getSupabase } from "@/lib/supabase/client";
import { AdminCrud, parseRefs, type CrudConfig, type Row } from "./AdminCrud";

const SURAH_OPTIONS = SURAHS.map((s) => ({ value: String(s.n), label: `${s.n}. ${s.name}` }));
const ID_HINT = "حروف إنجليزية صغيرة وأرقام وشرطات فقط، مثل: morning-kursi";

function VersePreview({ surah, from, to }: { surah: number; from: number; to: number }) {
  if (!isValidRef(surah, from) || !isValidRef(surah, to) || to < from) {
    return <p className="text-xs text-danger">مرجع الآيات غير صحيح لهذه السورة.</p>;
  }
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="mb-1 text-xs font-semibold text-muted">معاينة النص من المصدر المعتمد:</p>
      <QuranPassage refs={[{ surah, from, to }]} />
    </div>
  );
}

// ───────── نظرة عامة ─────────
export function AdminOverview() {
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setError(null);
    const { data, error: err } = await getSupabase()!.rpc("admin_stats");
    if (err) setError(err.message);
    else setStats(data as Record<string, number>);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!stats) return <Spinner />;
  const tiles = [
    ["إجمالي المستخدمين", stats.users_total],
    ["مستخدمون جدد (7 أيام)", stats.users_new_7d],
    ["نشطون اليوم", stats.users_active_1d],
    ["نشطون (7 أيام)", stats.users_active_7d],
    ["أذكار مفعّلة", stats.adhkar],
    ["لحظات منشورة", stats.moments_published],
    ["لحظات مجدولة قادمة", stats.moments_scheduled],
    ["دروس مفعّلة", stats.lessons],
    ["أخطاء (7 أيام)", stats.errors_7d],
  ] as const;
  return (
    <div className="space-y-4">
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {tiles.map(([k, v]) => (
          <li key={k} className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-2xl font-bold tabular-nums">{v ?? 0}</p>
            <p className="text-sm text-muted">{k}</p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">
        الإحصاءات مجمّعة فقط؛ لا تتيح لوحة الإدارة الاطلاع على تقدم المستخدمين أو خواطرهم الشخصية. «النشاط» = مزامنة بيانات خلال الفترة.
      </p>
      <Button variant="outline" size="sm" onClick={load}>
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        تحديث
      </Button>
    </div>
  );
}

// ───────── لحظة واحة ─────────
const MOMENTS: CrudConfig = {
  table: "oasis_moments",
  title: "لحظة واحة",
  keys: ["id"],
  order: [
    { column: "publish_date", ascending: false },
    { column: "id" },
  ],
  defaults: { surah: "1", ayah_from: 1, ayah_to: 1, status: "draft", meaning_source: "التفسير الميسر — نخبة من العلماء، مجمع الملك فهد لطباعة المصحف الشريف" },
  filter: {
    column: "status",
    label: "الحالة",
    options: [
      { value: "published", label: "منشورة" },
      { value: "draft", label: "مسودة" },
      { value: "archived", label: "مؤرشفة" },
    ],
  },
  fields: [
    { name: "surah", label: "السورة", type: "select", options: SURAH_OPTIONS, required: true },
    { name: "ayah_from", label: "من الآية", type: "number", required: true },
    {
      name: "ayah_to",
      label: "إلى الآية",
      type: "number",
      required: true,
      preview: (d) => <VersePreview surah={Number(d.surah)} from={Number(d.ayah_from)} to={Number(d.ayah_to)} />,
    },
    { name: "meaning", label: "المعنى (منقول من تفسير معتمد)", type: "textarea", hint: "انقل النص كما هو من المصدر، دون إعادة صياغة." },
    { name: "meaning_source", label: "مصدر المعنى", type: "text", hint: "مطلوب إذا كتبت معنى" },
    { name: "reflection", label: "سؤال للتفكّر (تحريري)", type: "textarea", rows: 2, hint: "يُعرض للمستخدم موسومًا بأنه تأمل تحريري وليس تفسيرًا" },
    { name: "action", label: "خطوة عملية (تحريري)", type: "textarea", rows: 2 },
    { name: "publish_date", label: "تاريخ النشر المجدول (اختياري)", type: "date", hint: "اتركه فارغًا لتدخل اللحظة ضمن المكتبة الدورية" },
    {
      name: "status",
      label: "الحالة",
      type: "select",
      required: true,
      options: [
        { value: "draft", label: "مسودة" },
        { value: "published", label: "منشورة" },
        { value: "archived", label: "مؤرشفة" },
      ],
    },
  ],
  validate: (r) => {
    const s = Number(r.surah);
    if (!isValidRef(s, Number(r.ayah_from)) || !isValidRef(s, Number(r.ayah_to)) || Number(r.ayah_to) < Number(r.ayah_from)) return "مرجع الآيات غير صحيح.";
    if (r.meaning && !r.meaning_source) return "يجب ذكر مصدر المعنى.";
    return null;
  },
  rowTitle: (r) => `سورة ${getSurahMeta(Number(r.surah))?.name} ${r.ayah_from}${r.ayah_to !== r.ayah_from ? `–${r.ayah_to}` : ""}`,
  rowMeta: (r) => (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Badge tone={r.status === "published" ? "success" : "neutral"}>{r.status === "published" ? "منشورة" : r.status === "draft" ? "مسودة" : "مؤرشفة"}</Badge>
      {r.publish_date ? `مجدولة: ${r.publish_date}` : "ضمن المكتبة الدورية"}
      {r.reflection ? ` · ${String(r.reflection).slice(0, 60)}` : ""}
    </span>
  ),
};

export function MomentsAdmin() {
  return <AdminCrud config={MOMENTS} />;
}

// ───────── الأذكار ─────────
function AdhkarCategoriesConfig(): CrudConfig {
  return {
    table: "adhkar_categories",
    title: "أقسام الأذكار",
    keys: ["id"],
    order: [{ column: "sort" }],
    defaults: { icon: "hands", sort: 10, active: true },
    fields: [
      { name: "id", label: "المعرّف", type: "text", required: true, createOnly: true, hint: ID_HINT },
      { name: "title", label: "العنوان", type: "text", required: true },
      { name: "description", label: "الوصف", type: "textarea", rows: 2 },
      {
        name: "icon",
        label: "الأيقونة",
        type: "select",
        required: true,
        options: [
          { value: "sunrise", label: "شروق" },
          { value: "sunset", label: "غروب" },
          { value: "prayer", label: "محراب" },
          { value: "moon", label: "قمر" },
          { value: "sun", label: "شمس" },
          { value: "hands", label: "دعاء" },
        ],
      },
      { name: "sort", label: "الترتيب", type: "number" },
      { name: "active", label: "مفعّل", type: "checkbox" },
    ],
    rowTitle: (r) => String(r.title),
    rowMeta: (r) => `${r.id} · ترتيب ${r.sort}`,
  };
}

export function AdhkarAdmin() {
  const [tab, setTab] = useState<"items" | "categories">("items");
  const [cats, setCats] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    void getSupabase()!
      .from("adhkar_categories")
      .select("id, title")
      .order("sort")
      .then(({ data }) => setCats((data ?? []).map((c) => ({ value: c.id, label: c.title }))));
  }, [tab]);

  const items: CrudConfig = {
    table: "adhkar",
    title: "الأذكار",
    keys: ["id"],
    order: [{ column: "category_id" }, { column: "sort" }],
    defaults: { repeat: 1, sort: 100, active: true, reviewed: false, category_id: cats[0]?.value ?? "" },
    filter: { column: "category_id", label: "القسم", options: cats },
    fields: [
      { name: "id", label: "المعرّف", type: "text", required: true, createOnly: true, hint: ID_HINT },
      { name: "category_id", label: "القسم", type: "select", required: true, options: cats },
      { name: "title", label: "عنوان قصير (اختياري)", type: "text" },
      { name: "body", label: "نص الذكر (من السنة)", type: "textarea", rows: 4, hint: "لا تكتب آيات هنا؛ استخدم حقل المراجع القرآنية" },
      {
        name: "quran",
        label: "مراجع قرآنية (اختياري)",
        type: "quranRefs",
        rows: 2,
        hint: "مرجع في كل سطر بصيغة سورة:من-إلى، مثل 2:255-255",
        preview: (d) => {
          try {
            const refs = parseRefs(String(d.quran ?? ""));
            if (!refs) return null;
            if (refs.some((r) => !isValidRef(r.surah, r.from) || !isValidRef(r.surah, r.to))) return <p className="text-xs text-danger">مرجع غير صالح.</p>;
            return (
              <div className="rounded-xl bg-surface-2 p-3">
                <QuranPassage refs={refs} />
              </div>
            );
          } catch (e) {
            return <p className="text-xs text-danger">{(e as Error).message}</p>;
          }
        },
      },
      { name: "repeat", label: "عدد التكرار", type: "number", required: true, hint: "اكتب العدد الوارد في الحديث فقط، وإلا فاتركه 1" },
      { name: "source_text", label: "المصدر / التخريج", type: "text", required: true, hint: "مثل: رواه مسلم (2723)" },
      { name: "virtue", label: "الفضل (نص الحديث فقط)", type: "textarea", rows: 2 },
      { name: "note", label: "ملاحظة", type: "textarea", rows: 2 },
      { name: "sort", label: "الترتيب", type: "number" },
      { name: "reviewed", label: "تمت مراجعته شرعيًا", type: "checkbox" },
      { name: "active", label: "مفعّل", type: "checkbox" },
    ],
    validate: (r) => {
      if (!r.body && !r.quran) return "أدخل نص الذكر أو مرجعًا قرآنيًا.";
      const refs = r.quran as { surah: number; from: number; to: number }[] | null;
      if (refs?.some((x) => !isValidRef(x.surah, x.from) || !isValidRef(x.surah, x.to) || x.to < x.from)) return "مرجع قرآني غير صالح.";
      return null;
    },
    rowTitle: (r) => (r.title ? String(r.title) : String(r.body ?? "").slice(0, 70) + (String(r.body ?? "").length > 70 ? "…" : "")),
    rowMeta: (r) => (
      <span className="inline-flex flex-wrap items-center gap-2">
        {cats.find((c) => c.value === r.category_id)?.label ?? String(r.category_id)} · ×{String(r.repeat)} · {String(r.source_text)}
        {!r.reviewed && <Badge tone="gold">بانتظار المراجعة</Badge>}
      </span>
    ),
  };

  return (
    <div className="space-y-4">
      <Segmented
        label="عرض"
        value={tab}
        onChange={setTab}
        options={[
          { value: "items", label: "الأذكار" },
          { value: "categories", label: "الأقسام" },
        ]}
      />
      {tab === "items" ? cats.length ? <AdminCrud key="items" config={items} /> : <Spinner /> : <AdminCrud key="cats" config={AdhkarCategoriesConfig()} />}
    </div>
  );
}

// ───────── التعلّم ─────────
const PATHS: CrudConfig = {
  table: "learning_paths",
  title: "المسارات",
  keys: ["id"],
  order: [{ column: "sort" }],
  defaults: { level: "مبتدئ", color: "olive", sort: 10, active: true },
  fields: [
    { name: "id", label: "المعرّف", type: "text", required: true, createOnly: true, hint: ID_HINT },
    { name: "title", label: "العنوان", type: "text", required: true },
    { name: "description", label: "الوصف", type: "textarea", rows: 3 },
    { name: "goals", label: "الأهداف التعليمية", type: "list", hint: "هدف في كل سطر" },
    { name: "level", label: "المستوى", type: "select", required: true, options: [{ value: "مبتدئ", label: "مبتدئ" }, { value: "متوسط", label: "متوسط" }] },
    { name: "color", label: "اللون", type: "select", required: true, options: [{ value: "olive", label: "زيتوني" }, { value: "gold", label: "ذهبي" }, { value: "deep", label: "أخضر داكن" }] },
    { name: "sort", label: "الترتيب", type: "number" },
    { name: "active", label: "مفعّل", type: "checkbox" },
  ],
  rowTitle: (r) => String(r.title),
  rowMeta: (r) => `${r.id} · ${r.level}`,
};

export function LearningAdmin() {
  const [tab, setTab] = useState<"paths" | "lessons">("lessons");
  const [paths, setPaths] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    void getSupabase()!
      .from("learning_paths")
      .select("id, title")
      .order("sort")
      .then(({ data }) => setPaths((data ?? []).map((p) => ({ value: p.id, label: p.title }))));
  }, [tab]);
  const lessons: CrudConfig = {
    table: "lessons",
    title: "الدروس",
    keys: ["path_id", "id"],
    order: [{ column: "path_id" }, { column: "sort" }],
    defaults: { path_id: paths[0]?.value ?? "", minutes: 5, sort: 10, active: true },
    filter: { column: "path_id", label: "المسار", options: paths },
    fields: [
      { name: "path_id", label: "المسار", type: "select", required: true, options: paths, createOnly: true },
      { name: "id", label: "المعرّف", type: "text", required: true, createOnly: true, hint: ID_HINT },
      { name: "title", label: "العنوان", type: "text", required: true },
      { name: "summary", label: "ملخص", type: "textarea", rows: 2 },
      { name: "minutes", label: "المدة بالدقائق", type: "number", required: true },
      {
        name: "body",
        label: "نص الدرس",
        type: "textarea",
        rows: 14,
        required: true,
        hint: "فقرات يفصلها سطر فارغ · «## » لعنوان فرعي · «- » لعنصر قائمة · [[q:2:255]] أو [[q:1:1-7]] لإدراج آيات من المصدر المعتمد (لا تكتب الآيات يدويًا)",
      },
      { name: "sources", label: "المراجع", type: "list", hint: "مرجع في كل سطر" },
      { name: "sort", label: "الترتيب", type: "number" },
      { name: "active", label: "مفعّل", type: "checkbox" },
    ],
    rowTitle: (r) => String(r.title),
    rowMeta: (r) => `${paths.find((p) => p.value === r.path_id)?.label ?? r.path_id} · ${r.minutes} د`,
  };
  return (
    <div className="space-y-4">
      <Segmented
        label="عرض"
        value={tab}
        onChange={setTab}
        options={[
          { value: "lessons", label: "الدروس" },
          { value: "paths", label: "المسارات" },
        ]}
      />
      {tab === "lessons" ? paths.length ? <AdminCrud key="lessons" config={lessons} /> : <Spinner /> : <AdminCrud key="paths" config={PATHS} />}
    </div>
  );
}

// ───────── المصادر ─────────
const SOURCES_CFG: CrudConfig = {
  table: "sources",
  title: "المصادر",
  keys: ["id"],
  order: [{ column: "kind" }, { column: "title" }],
  defaults: { kind: "other", active: true },
  fields: [
    { name: "title", label: "العنوان", type: "text", required: true },
    { name: "author", label: "المؤلف", type: "text" },
    { name: "publisher", label: "الناشر", type: "text" },
    { name: "url", label: "الرابط", type: "text", hint: "يبدأ بـ https://" },
    { name: "license", label: "الترخيص / شروط الاستخدام", type: "text" },
    {
      name: "kind",
      label: "النوع",
      type: "select",
      required: true,
      options: [
        { value: "quran", label: "القرآن" },
        { value: "tafsir", label: "تفسير" },
        { value: "hadith", label: "حديث" },
        { value: "adhkar", label: "أذكار" },
        { value: "learning", label: "تعلّم" },
        { value: "other", label: "أخرى" },
      ],
    },
    { name: "notes", label: "ملاحظات", type: "textarea", rows: 3 },
    { name: "active", label: "مفعّل", type: "checkbox" },
  ],
  rowTitle: (r) => String(r.title),
  rowMeta: (r) => [r.publisher, r.license, r.url].filter(Boolean).join(" · "),
};

export function SourcesAdmin() {
  return <AdminCrud config={SOURCES_CFG} />;
}

// ───────── المستخدمون ─────────
interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  role: "user" | "editor" | "admin";
  created_at: string;
  last_sign_in_at: string | null;
}

export function UsersAdmin() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<{ u: UserRow; role: UserRow["role"] } | null>(null);
  const load = useCallback(async (s = "") => {
    setError(null);
    const { data, error: err } = await getSupabase()!.rpc("admin_list_users", { search: s || null, lim: 100, off: 0 });
    if (err) setError(err.message);
    else setRows(data as UserRow[]);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load(search.trim());
        }}
      >
        <Input aria-label="بحث بالبريد أو الاسم" placeholder="بحث بالبريد أو الاسم" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button type="submit" variant="secondary">
          بحث
        </Button>
      </form>
      {error ? (
        <ErrorState message={error} onRetry={() => load(search)} />
      ) : !rows ? (
        <Spinner />
      ) : !rows.length ? (
        <EmptyState title="لا يوجد مستخدمون" />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {rows.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{u.display_name || "—"}</p>
                  <p className="text-xs text-muted" dir="ltr">
                    {u.email}
                  </p>
                  <p className="text-xs text-muted">
                    انضم {new Date(u.created_at).toLocaleDateString("ar")} · آخر دخول {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("ar") : "—"}
                  </p>
                </div>
                <Select
                  aria-label={`دور ${u.email}`}
                  value={u.role}
                  disabled={u.id === me?.id}
                  onChange={(e) => setPending({ u, role: e.target.value as UserRow["role"] })}
                  className="w-auto"
                >
                  <option value="user">مستخدم</option>
                  <option value="editor">محرر محتوى</option>
                  <option value="admin">مدير</option>
                </Select>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <p className="text-xs text-muted">المحرر يدير المحتوى فقط؛ المدير يدير المحتوى والمستخدمين وسجل الأخطاء. لا يمكنك تغيير دورك بنفسك.</p>
      <ConfirmDialog
        open={!!pending}
        title="تغيير الصلاحية"
        message={pending ? `تغيير دور ${pending.u.email} إلى «${{ user: "مستخدم", editor: "محرر محتوى", admin: "مدير" }[pending.role]}»؟` : ""}
        onClose={() => setPending(null)}
        onConfirm={async () => {
          if (!pending) return;
          const { error: err } = await getSupabase()!.rpc("admin_set_role", { target: pending.u.id, new_role: pending.role });
          if (err) toast(err.message.includes("آخر مدير") ? "لا يمكن إزالة آخر مدير" : "تعذّر تغيير الدور", "error");
          else toast("حُدّثت الصلاحية");
          void load(search);
        }}
      />
    </div>
  );
}

// ───────── الأخطاء ─────────
interface ErrorRow {
  id: number;
  created_at: string;
  message: string;
  url: string | null;
  user_agent: string | null;
  stack: string | null;
}

export function ErrorsAdmin() {
  const toast = useToast();
  const [rows, setRows] = useState<ErrorRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const load = useCallback(async () => {
    setError(null);
    const { data, error: err } = await getSupabase()!
      .from("error_logs")
      .select("id, created_at, message, url, user_agent, stack")
      .order("created_at", { ascending: false })
      .limit(200);
    if (err) setError(err.message);
    else setRows(data as ErrorRow[]);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          تحديث
        </Button>
        {rows && rows.length > 0 && (
          <Button variant="ghost" size="sm" className="text-danger" onClick={() => setConfirm(true)}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            حذف المعروض
          </Button>
        )}
      </div>
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !rows ? (
        <Spinner />
      ) : !rows.length ? (
        <EmptyState title="لا توجد أخطاء مسجلة" />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <details>
                  <summary className="cursor-pointer">
                    <span className="font-mono text-sm" dir="ltr">
                      {r.message}
                    </span>
                    <span className="block text-xs text-muted">
                      {new Date(r.created_at).toLocaleString("ar")} · {r.url}
                    </span>
                  </summary>
                  {r.stack && (
                    <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-surface-2 p-3 text-xs" dir="ltr">
                      {r.stack}
                    </pre>
                  )}
                  <p className="mt-1 text-xs text-muted" dir="ltr">
                    {r.user_agent}
                  </p>
                </details>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <ConfirmDialog
        open={confirm}
        danger
        title="حذف سجل الأخطاء"
        message="سيُحذف كل ما هو معروض من سجل الأخطاء."
        confirmLabel="حذف"
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          if (!rows) return;
          const { error: err } = await getSupabase()!.from("error_logs").delete().in("id", rows.map((r) => r.id));
          if (err) toast("تعذّر الحذف", "error");
          else toast("حُذف السجل");
          void load();
        }}
      />
      <p className="text-xs text-muted">
        يُسجَّل بحد أقصى ٥ أخطاء لكل زائر كل ١٠ دقائق. للأخطاء على الخادم راجع سجلات منصة الاستضافة (مثل Vercel). <Link href="/admin" className="underline">العودة</Link>
      </p>
    </div>
  );
}
