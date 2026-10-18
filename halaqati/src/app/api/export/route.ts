import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { safeFileName, toCsv, toXlsx, type Table } from "@/lib/export";
import { ACTIVITY, ATTENDANCE, COMPLETION, CONTEXT_LABELS_AR } from "@/lib/export-labels";
import { formatRange } from "@/lib/quran/surahs";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Supa = Awaited<ReturnType<typeof createClient>>;

/**
 * Downloads as Excel (xlsx) or CSV. Every query runs as the signed-in user,
 * so RLS and the RPCs' own checks decide what can be exported.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
  const sp = request.nextUrl.searchParams;
  const type = sp.get("type") ?? "";
  const format = sp.get("format") === "csv" ? "csv" : "xlsx";
  const id = sp.get("id");
  if (id && !UUID.test(id)) return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });
  const supabase = await createClient();

  let table: Table | null = null;
  try {
    table = await build(supabase, type, id, user.id);
  } catch {
    return NextResponse.json({ error: "لا تملك صلاحية هذا التصدير" }, { status: 403 });
  }
  if (!table) return NextResponse.json({ error: "نوع تصدير غير معروف" }, { status: 400 });

  const name = encodeURIComponent(`${safeFileName(table.title)}.${format}`);
  const headers = {
    "Content-Disposition": `attachment; filename="halaqati.${format}"; filename*=UTF-8''${name}`,
    "Cache-Control": "private, no-store",
  };
  if (format === "csv") {
    return new NextResponse(toCsv(table), { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" } });
  }
  return new NextResponse(await toXlsx(table), {
    headers: { ...headers, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  });
}

function must<T>(res: { data: unknown; error: unknown }): T {
  if (res.error) throw res.error;
  return (res.data ?? []) as T;
}

async function build(supabase: Supa, type: string, id: string | null, userId: string): Promise<Table | null> {
  switch (type) {
    case "halaqa-students": {
      if (!id) return null;
      const [rows, sums, h] = await Promise.all([
        supabase.rpc("get_halaqa_student_table", { p_halaqa: id, p_days: 30 }),
        supabase.rpc("get_halaqa_member_summaries", { p_halaqa: id }),
        supabase.from("halaqat").select("name").eq("id", id).single(),
      ]);
      const sm = new Map(must<Array<Record<string, unknown>>>(sums).map((s) => [s.student_id as string, s]));
      return {
        title: `طلاب ${h.data?.name ?? "الحلقة"}`,
        columns: [
          { key: "name", label: "الطالب", width: 24 }, { key: "points_total", label: "النقاط" }, { key: "points_week", label: "نقاط الأسبوع" },
          { key: "current_streak", label: "الحماسة (أيام)" }, { key: "week_rank", label: "ترتيب الدوري" },
          { key: "attendance", label: "الحضور (30 يومًا)" }, { key: "memorized_ayat", label: "الحفظ المعتمد (آية)" },
          { key: "reviewed_ayat_period", label: "المراجعة (آية)" }, { key: "mastery_avg", label: "الإتقان" },
          { key: "recitation_avg", label: "التلاوة" }, { key: "last_recorded_on", label: "آخر تسميع" }, { key: "open_assignment", label: "الواجب القادم", width: 28 },
        ],
        rows: must<Array<Record<string, unknown>>>(rows).map((r) => ({
          ...r, ...(sm.get(r.student_id as string) ?? {}),
          attendance: Number(r.sessions_marked) ? `${r.sessions_attended}/${r.sessions_marked}` : "",
        })),
      };
    }
    case "halaqa-attendance": {
      if (!id) return null;
      const [att, h] = await Promise.all([
        supabase.from("attendance_records").select("status, quran_sessions(starts_at), profiles!attendance_records_student_id_fkey(full_name, display_name)")
          .eq("halaqa_id", id).order("created_at", { ascending: false }).limit(5000),
        supabase.from("halaqat").select("name, timezone").eq("id", id).single(),
      ]);
      type A = { status: string; quran_sessions: { starts_at: string } | null; profiles: { full_name: string; display_name: string | null } | null };
      const fmt = new Intl.DateTimeFormat("ar-SA-u-nu-latn-ca-gregory", { dateStyle: "medium", timeStyle: "short", timeZone: h.data?.timezone ?? "UTC" });
      return {
        title: `حضور ${h.data?.name ?? "الحلقة"}`,
        columns: [{ key: "when", label: "الجلسة", width: 24 }, { key: "name", label: "الطالب", width: 24 }, { key: "status", label: "الحالة" }],
        rows: must<A[]>(att).map((a) => ({
          when: a.quran_sessions ? fmt.format(new Date(a.quran_sessions.starts_at)) : "",
          name: a.profiles?.display_name || a.profiles?.full_name || "",
          status: ATTENDANCE[a.status] ?? a.status,
        })),
      };
    }
    case "records": {
      const student = id ?? userId;
      const res = await supabase.from("quran_progress_records")
        .select("recorded_on, activity, surah_from, ayah_from, surah_to, ayah_to, ayah_count, completion, mastery_score, recitation_score, teacher_notes, status, halaqat(name)")
        .eq("student_id", student).eq("status", "approved").order("recorded_on", { ascending: false }).limit(5000);
      type R = Record<string, unknown> & { halaqat: { name: string } | null; activity: string; completion: string };
      return {
        title: "سجل التسميع",
        columns: [
          { key: "recorded_on", label: "التاريخ" }, { key: "halaqa", label: "الحلقة", width: 22 }, { key: "activity", label: "النوع" },
          { key: "range", label: "المقطع", width: 26 }, { key: "ayah_count", label: "الآيات" }, { key: "completion", label: "الإنجاز" },
          { key: "mastery_score", label: "الإتقان" }, { key: "recitation_score", label: "التلاوة" }, { key: "teacher_notes", label: "ملاحظات", width: 30 },
        ],
        rows: must<R[]>(res).map((r) => ({
          ...r, halaqa: r.halaqat?.name ?? "", activity: ACTIVITY[r.activity] ?? r.activity, completion: COMPLETION[r.completion] ?? r.completion,
          range: formatRange(r as unknown as Parameters<typeof formatRange>[0]),
        })),
      };
    }
    case "league": {
      if (!id) return null;
      const res = await supabase.rpc("get_halaqa_league", { p_halaqa: id, p_period: "all" });
      return {
        title: "ترتيب الدوري",
        columns: [{ key: "rank", label: "المركز" }, { key: "name", label: "الطالب", width: 24 }, { key: "points", label: "النقاط" }],
        rows: must<Array<Record<string, unknown>>>(res),
      };
    }
    case "certificates": {
      const res = await supabase.from("certificates").select("serial, title, kind, issued_on, revoked_at").eq("student_id", id ?? userId).order("issued_on", { ascending: false }).limit(500);
      return {
        title: "الشهادات",
        columns: [{ key: "serial", label: "الرقم", width: 20 }, { key: "title", label: "العنوان", width: 30 }, { key: "issued_on", label: "تاريخ الإصدار" }, { key: "state", label: "الحالة" }],
        rows: must<Array<Record<string, unknown>>>(res).map((c) => ({ ...c, state: c.revoked_at ? "ملغاة" : "سارية" })),
      };
    }
    case "admin-users": {
      const res = await supabase.rpc("admin_list_users", { p_search: null, p_limit: 1000, p_offset: 0 });
      return {
        title: "المستخدمون",
        columns: [{ key: "full_name", label: "الاسم", width: 24 }, { key: "email", label: "البريد", width: 30 }, { key: "roles", label: "الأدوار", width: 30 }, { key: "created_at", label: "تاريخ التسجيل", width: 22 }],
        rows: must<Array<Record<string, unknown>>>(res).map((r) => ({
          ...r, roles: ((r.roles as string[]) ?? []).map((x) => (CONTEXT_LABELS_AR as Record<string, string>)[x] ?? x),
          created_at: String(r.created_at).slice(0, 10),
        })),
      };
    }
    default:
      return null;
  }
}
