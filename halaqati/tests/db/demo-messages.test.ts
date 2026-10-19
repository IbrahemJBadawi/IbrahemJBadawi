/** Demo data (seed & purge), halaqa messages and badge statistics. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type Db } from "./harness";

let db: Db;
const u: Record<string, string> = {};

beforeAll(async () => {
  db = await createTestDb();
  u.admin = await db.createUser({ email: "admin@d.local", name: "المدير", roles: ["student", "parent", "quran_teacher"] });
  await db.sql("select private.bootstrap_platform_admin('admin@d.local')");
  u.teacher = await db.createUser({ email: "t@d.local", name: "محفظ حقيقي", roles: ["quran_teacher"] });
  u.student = await db.createUser({ email: "s@d.local", name: "طالب حقيقي", roles: ["student"] });
  u.parent = await db.createUser({ email: "p@d.local", name: "ولي حقيقي", roles: ["parent"] });
  u.outsider = await db.createUser({ email: "o@d.local", name: "غريب", roles: ["student"] });
});
afterAll(async () => { await db?.close(); });

const scalar = async <T,>(sql: string, params: unknown[] = []) => (await db.sql<{ v: T }>(sql, params))[0].v;

describe("demo data", () => {
  it("only a platform admin can seed, and it builds a labelled world around them", async () => {
    await expect(db.as(u.student, (c) => c.query("select public.admin_seed_demo()"))).rejects.toThrow(/صلاحية/);
    const res = await db.as(u.admin, async (c) => (await c.query("select public.admin_seed_demo() as r")).rows[0].r);
    expect(res.users).toBe(10);
    expect(res.halaqat).toBe(2);
    expect(res.records).toBeGreaterThan(10);
    // Everything demo is labelled, and demo people cannot sign in.
    expect(await scalar<number>("select count(*)::int v from public.profiles where is_demo and full_name not like '%(تجريبي)%'")).toBe(0);
    expect(await scalar<number>("select count(*)::int v from auth.users u join public.profiles p on p.id = u.id where p.is_demo and u.encrypted_password is not null")).toBe(0);
    // The admin is a student in halaqa A, teaches halaqa B, follows a demo child.
    const m = await db.as(u.admin, async (c) => (await c.query("select public.get_my_motivation() as m")).rows[0].m);
    expect(m.points_total).toBeGreaterThan(0);
    const league = await db.as(u.admin, async (c) => (await c.query(
      "select l.* from public.halaqat h, public.get_halaqa_league(h.id, 'all') l where h.is_demo and h.teacher_id <> $1", [u.admin])).rows);
    expect(league.length).toBe(7);
    expect(league.some((r) => r.is_me)).toBe(true);
    expect(await db.as(u.admin, async (c) => (await c.query("select * from public.parent_student_links where parent_id = $1", [u.admin])).rowCount)).toBe(1);
    // A second seed is refused.
    await expect(db.as(u.admin, (c) => c.query("select public.admin_seed_demo()"))).rejects.toThrow(/موجودة/);
  });

  it("demo halaqat never appear publicly and nobody else can flag data as demo", async () => {
    const pub = await db.as(u.outsider, async (c) => (await c.query("select * from public.get_public_halaqat()")).rows);
    expect(pub.filter((h) => h.name.includes("تجريبية"))).toHaveLength(0);
    const real = await db.as(u.teacher, async (c) =>
      (await c.query("insert into public.halaqat (name, teacher_id, status, join_policy) values ('حلقة حقيقية', $1, 'published', 'open') returning id", [u.teacher])).rows[0].id);
    await expect(db.as(u.teacher, (c) => c.query("update public.halaqat set is_demo = true where id = $1", [real]))).rejects.toThrow(/لا يمكن/);
    await expect(db.as(u.teacher, (c) => c.query("update public.profiles set is_demo = true where id = $1", [u.teacher]))).rejects.toThrow(/permission denied/);
    // Approved records outside a purge are still undeletable, even demo ones.
    await expect(db.sql("delete from public.quran_progress_records where halaqa_id in (select id from public.halaqat where is_demo) and status = 'approved'"))
      .rejects.toThrow(/لا يمكن حذف/);
  });

  it("purge removes every demo row and leaves real data intact", async () => {
    const realBefore = await scalar<number>("select count(*)::int v from public.halaqat where not is_demo");
    await expect(db.as(u.student, (c) => c.query("select public.admin_purge_demo()"))).rejects.toThrow(/صلاحية/);
    const res = await db.as(u.admin, async (c) => (await c.query("select public.admin_purge_demo() as r")).rows[0].r);
    expect(res).toEqual({ users: 10, halaqat: 2 });
    expect(await scalar<number>("select count(*)::int v from public.profiles where is_demo")).toBe(0);
    expect(await scalar<number>("select count(*)::int v from public.halaqat where is_demo")).toBe(0);
    expect(await scalar<number>("select count(*)::int v from public.halaqat where not is_demo")).toBe(realBefore);
    expect(await scalar<number>("select count(*)::int v from public.points_ledger where user_id = $1", [u.admin])).toBe(0);
    expect(await scalar<number>("select count(*)::int v from public.certificates where student_id = $1", [u.admin])).toBe(0);
    expect(await scalar<number>("select count(*)::int v from public.notifications where user_id = $1", [u.admin])).toBe(0);
    expect(await scalar<number>("select count(*)::int v from public.profiles where id = $1", [u.admin])).toBe(1);
    // It can be seeded again afterwards.
    await db.as(u.admin, (c) => c.query("select public.admin_seed_demo()"));
    await db.as(u.admin, (c) => c.query("select public.admin_purge_demo()"));
  });
});

describe("halaqa messages", () => {
  let halaqa = "";
  beforeAll(async () => {
    halaqa = await db.as(u.teacher, async (c) =>
      (await c.query("insert into public.halaqat (name, teacher_id, status, join_policy) values ('حلقة الرسائل', $1, 'published', 'open') returning id", [u.teacher])).rows[0].id);
    await db.as(u.student, (c) => c.query("select public.request_join_halaqa($1)", [halaqa]));
    const code = await db.as(u.student, async (c) => (await c.query("select public.create_parent_link_code() as c")).rows[0].c);
    await db.as(u.parent, (c) => c.query("select public.redeem_parent_link_code($1, 'father')", [code]));
  });

  it("teacher announcements reach students and parents; outsiders see nothing", async () => {
    await db.as(u.teacher, (c) => c.query("select public.post_halaqa_message($1, 'غدًا مراجعة جزء عمّ', true)", [halaqa]));
    for (const who of [u.student, u.parent]) {
      const rows = await db.as(who, async (c) => (await c.query("select * from public.get_halaqa_messages($1)", [halaqa])).rows);
      expect(rows[0]).toMatchObject({ body: "غدًا مراجعة جزء عمّ", is_announcement: true, author_role: "teacher" });
      expect(await scalar<number>("select count(*)::int v from public.notifications where user_id = $1 and kind = 'halaqa.announcement'", [who])).toBe(1);
    }
    await expect(db.as(u.outsider, (c) => c.query("select * from public.get_halaqa_messages($1)", [halaqa]))).rejects.toThrow(/لأعضاء/);
    expect(await db.as(u.outsider, async (c) => (await c.query("select * from public.halaqa_messages")).rowCount)).toBe(0);
  });

  it("students post only when the teacher allows it; parents never post; no direct writes", async () => {
    await expect(db.as(u.student, (c) => c.query("select public.post_halaqa_message($1, 'سؤال')", [halaqa]))).rejects.toThrow(/للمعلّم فقط/);
    await db.as(u.teacher, (c) => c.query("update public.halaqat set chat_students_can_post = true where id = $1", [halaqa]));
    const id = await db.as(u.student, async (c) => (await c.query("select public.post_halaqa_message($1, 'سؤال', true) as id", [halaqa])).rows[0].id);
    expect(await scalar<boolean>("select is_announcement v from public.halaqa_messages where id = $1", [id])).toBe(false);
    await expect(db.as(u.parent, (c) => c.query("select public.post_halaqa_message($1, 'مرحبا')", [halaqa]))).rejects.toThrow(/للمعلّم فقط/);
    await expect(db.as(u.student, (c) => c.query("insert into public.halaqa_messages (halaqa_id, author_id, body) values ($1, $2, 'x')", [halaqa, u.student]))).rejects.toThrow(/permission denied/);
    // Only the author or staff can delete; only staff can pin.
    await expect(db.as(u.parent, (c) => c.query("select public.delete_halaqa_message($1)", [id]))).rejects.toThrow(/صلاحية/);
    await expect(db.as(u.student, (c) => c.query("select public.pin_halaqa_message($1, true)", [id]))).rejects.toThrow(/للمعلّم/);
    await db.as(u.teacher, (c) => c.query("select public.delete_halaqa_message($1)", [id]));
    const rows = await db.as(u.student, async (c) => (await c.query("select * from public.get_halaqa_messages($1)", [halaqa])).rows);
    expect(rows.map((r) => r.id)).not.toContain(id);
  });
});

describe("badge stats", () => {
  it("are visible to the student and their parent only", async () => {
    const s = await db.as(u.student, async (c) => (await c.query("select public.get_my_badge_stats() as s")).rows[0].s);
    expect(s).toHaveProperty("recitations");
    await db.as(u.parent, (c) => c.query("select public.get_my_badge_stats($1)", [u.student]));
    await expect(db.as(u.outsider, (c) => c.query("select public.get_my_badge_stats($1)", [u.student]))).rejects.toThrow(/صلاحية/);
  });
});

describe("member summaries", () => {
  it("the halaqa's teacher sees each member's summary; others cannot", async () => {
    const halaqa = await db.as(u.teacher, async (c) =>
      (await c.query("insert into public.halaqat (name, teacher_id, status, join_policy) values ('حلقة الملخص', $1, 'published', 'open') returning id", [u.teacher])).rows[0].id);
    await db.as(u.outsider, (c) => c.query("select public.request_join_halaqa($1)", [halaqa]));
    const rows = await db.as(u.teacher, async (c) => (await c.query("select * from public.get_halaqa_member_summaries($1)", [halaqa])).rows);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ student_id: u.outsider, week_rank: "1", members: "1", current_streak: 0 });
    // The teacher may read the motivation of their own student only.
    await db.as(u.teacher, (c) => c.query("select public.get_my_motivation($1)", [u.outsider]));
    await expect(db.as(u.student, (c) => c.query("select public.get_halaqa_member_summaries($1)", [halaqa]))).rejects.toThrow(/صلاحية/);
    await expect(db.as(u.student, (c) => c.query("select public.get_my_motivation($1)", [u.outsider]))).rejects.toThrow(/صلاحية/);
  });
});
