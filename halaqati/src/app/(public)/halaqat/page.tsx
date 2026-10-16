import type { Metadata } from "next";
import { HalaqaCard } from "@/components/HalaqaCard";
import { NotConfigured } from "@/components/NotConfigured";
import { Alert, Button, EmptyState, Input, PageHeader, Pagination, Select } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/env";
import { AUDIENCE, LEVEL, MEETING_MODE } from "@/lib/labels";
import { createPublicClient } from "@/lib/supabase/server";
import type { PublicHalaqa } from "@/lib/types";

export const metadata: Metadata = { title: "استعراض الحلقات" };

const PAGE_SIZE = 12;
const pick = (v: unknown, allowed: Record<string, string>) => (typeof v === "string" && v in allowed ? v : null);

export default async function HalaqatPage({ searchParams }: PageProps<"/halaqat">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const mode = pick(sp.mode, MEETING_MODE);
  const level = pick(sp.level, LEVEL);
  const gender = pick(sp.gender, AUDIENCE);
  const page = Math.max(1, Number(sp.page) || 1);

  let rows: PublicHalaqa[] = [];
  let failed = false;
  if (isSupabaseConfigured) {
    const { data, error } = await createPublicClient().rpc("get_public_halaqat", {
      p_search: q || null,
      p_mode: mode,
      p_level: level,
      p_gender: gender,
      p_limit: PAGE_SIZE,
      p_offset: (page - 1) * PAGE_SIZE,
    });
    failed = Boolean(error);
    rows = (data ?? []) as PublicHalaqa[];
  }
  const total = Number(rows[0]?.total_count ?? 0);
  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (mode) params.set("mode", mode);
    if (level) params.set("level", level);
    if (gender) params.set("gender", gender);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/halaqat${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader title="الحلقات القرآنية" description="حلقات مستقلة وحلقات تابعة لدور ومراكز، حضورية وعن بُعد." />
      <form className="mb-6 grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-5" role="search">
        <label className="sr-only" htmlFor="q">بحث</label>
        <Input name="q" defaultValue={q} placeholder="ابحث باسم الحلقة أو المدينة" className="sm:col-span-2" />
        <Select name="mode" defaultValue={mode ?? ""} aria-label="نوع اللقاء">
          <option value="">كل أنواع اللقاء</option>
          {Object.entries(MEETING_MODE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select name="level" defaultValue={level ?? ""} aria-label="المستوى">
          <option value="">كل المستويات</option>
          {Object.entries(LEVEL).filter(([k]) => k !== "all").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select name="gender" defaultValue={gender ?? ""} aria-label="الفئة">
          <option value="">الجميع</option>
          {Object.entries(AUDIENCE).filter(([k]) => k !== "mixed").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Button type="submit" className="sm:col-span-5 sm:justify-self-start">بحث</Button>
      </form>

      {!isSupabaseConfigured ? (
        <NotConfigured />
      ) : failed ? (
        <Alert tone="error">تعذّر تحميل الحلقات حاليًا. حاول بعد قليل.</Alert>
      ) : rows.length === 0 ? (
        <EmptyState title="لا توجد حلقات مطابقة">جرّب تغيير معايير البحث.</EmptyState>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">{total} حلقة</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((h) => <HalaqaCard key={h.id} h={h} />)}
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} hrefFor={qs} />
        </>
      )}
    </>
  );
}
