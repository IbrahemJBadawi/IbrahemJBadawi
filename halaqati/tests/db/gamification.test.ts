/** Points, streak, league, tasks, reactions, statistics and push plumbing. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type Db } from "./harness";

let db: Db;
const u: Record<string, string> = {};
let halaqaId = "";
let otherHalaqa = "";

beforeAll(async () => {
  db = await createTestDb();
  u.teacher = await db.createUser({ email: "t@g.local", name: "المحفظ", roles: ["quran_teacher"] });
  u.s1 = await db.createUser({ email: "s1@g.local", name: "أحمد", roles: ["student"] });
  u.s2 = await db.createUser({ email: "s2@g.local", name: "خالد", roles: ["student"] });
  u.outsider = await db.createUser({ email: "o@g.local", name: "غريب", roles: ["student"] });
  u.parent = await db.createUser({ email: "p@g.local", name: "الأب", roles: ["parent"] });
  halaqaId = await db.as(u.teacher, async (c) =>
    (await c.query("insert into public.halaqat (name, teacher_id, status, join_policy) values ('حلقة', $1, 'published', 'open') returning id", [u.teacher])).rows[0].id);
  otherHalaqa = await db.as(u.teacher, async (c) =>
    (await c.query("insert into public.halaqat (name, teacher_id, status, join_policy) values ('حلقة أخرى', $1, 'published', 'open') returning id", [u.teacher])).rows[0].id);
  for (const s of [u.s1, u.s2]) await db.as(s, (c) => c.query("select public.request_join_halaqa($1)", [halaqaId]));
  await db.as(u.outsider, (c) => c.query("select public.request_join_halaqa($1)", [otherHalaqa]));
});
afterAll(async () => { await db?.close(); });

const recite = (student: string, approve = true) =>
  db.as(u.teacher, async (c) => (await c.query("select public.record_recitation($1) as id", [JSON.stringify({
    student_id: student, halaqa_id: halaqaId, activity: "new_memorization", surah_from: 114, ayah_from: 1, surah_to: 114, ayah_to: 6,
    completion: "completed", mastery_score: 5, approve,
  })])).rows[0].id as string);

describe("points and streak", () => {
  it("approved recitation and attendance earn points; drafts do not", async () => {
    const draft = await recite(u.s1, false);
    expect((await db.sql("select * from public.points_ledger where ref_id = $1", [draft])).length).toBe(0);
    await db.as(u.teacher, (c) => c.query("select public.approve_progress_record($1)", [draft]));
    const pts = await db.sql<{ points: number }>("select points from public.points_ledger where ref_id = $1", [draft]);
    expect(pts[0].points).toBe(15);
    const session = await db.as(u.teacher, async (c) => (await c.query("insert into public.quran_sessions (halaqa_id, starts_at) values ($1, now()) returning id", [halaqaId])).rows[0].id);
    await db.as(u.teacher, (c) => c.query("select public.save_attendance($1, $2)", [session, JSON.stringify([{ student_id: u.s1, status: "present" }, { student_id: u.s2, status: "late" }])]));
    const m = await db.as(u.s1, async (c) => (await c.query("select public.get_my_motivation() as m")).rows[0].m);
    expect(m.points_total).toBe(20);
    expect(m.current_streak).toBe(1);
    expect(m.active_today).toBe(true);
    expect(m.last7).toHaveLength(7);
  });

  it("students cannot write points directly or read others' motivation", async () => {
    await expect(db.as(u.s1, (c) => c.query("insert into public.points_ledger (user_id, source, ref_id, points) values ($1, 'task', gen_random_uuid(), 100)", [u.s1]))).rejects.toThrow(/permission denied/);
    await expect(db.as(u.s2, (c) => c.query("select public.get_my_motivation($1)", [u.s1]))).rejects.toThrow(/صلاحية/);
    expect(await db.as(u.s2, async (c) => (await c.query("select * from public.points_ledger where user_id = $1", [u.s1])).rowCount)).toBe(0);
  });

  it("streak counts consecutive days back from yesterday", async () => {
    for (const d of [1, 2, 3]) {
      await db.sql("insert into public.points_ledger (user_id, source, ref_id, points, day) values ($1, 'daily_wird', gen_random_uuid(), 3, current_date - $2::int)", [u.s2, d]);
    }
    const m = await db.as(u.s2, async (c) => (await c.query("select public.get_my_motivation() as m")).rows[0].m);
    expect(m.current_streak).toBe(4); // today (late attendance) + 3 previous days
  });

  it("daily wird and tasks award capped points", async () => {
    await db.as(u.s1, (c) => c.query("select public.log_daily_wird(5, 'سورة الكهف')"));
    await db.as(u.s1, (c) => c.query("select public.log_daily_wird(7)")); // same day: updated, not doubled
    const wird = await db.sql<{ n: number }>("select count(*)::int n from public.points_ledger where user_id = $1 and source = 'daily_wird'", [u.s1]);
    expect(wird[0].n).toBe(1);
    for (let i = 0; i < 7; i++) {
      await db.as(u.s1, (c) => c.query("insert into public.personal_tasks (user_id, title, done_at) values ($1, $2, now())", [u.s1, `مهمة ${i}`]));
    }
    const tasks = await db.sql<{ s: number }>("select coalesce(sum(points),0)::int s from public.points_ledger where user_id = $1 and source = 'task'", [u.s1]);
    expect(tasks[0].s).toBe(10);
    // Tasks are private.
    expect(await db.as(u.s2, async (c) => (await c.query("select * from public.personal_tasks")).rowCount)).toBe(0);
    await expect(db.as(u.s2, (c) => c.query("insert into public.personal_tasks (user_id, title) values ($1, 'x x')", [u.s1]))).rejects.toThrow(/row-level security/);
  });
});

describe("league", () => {
  it("ranks members inside the halaqa only, honours hidden names and the off switch", async () => {
    const rows = await db.as(u.s2, async (c) => (await c.query("select * from public.get_halaqa_league($1, 'all')", [halaqaId])).rows);
    expect(rows.map((r) => r.name)).toEqual(["أحمد", "خالد"]);
    expect(rows.find((r) => r.is_me).name).toBe("خالد");
    await expect(db.as(u.outsider, (c) => c.query("select * from public.get_halaqa_league($1)", [halaqaId]))).rejects.toThrow(/لأعضاء الحلقة/);
    await db.as(u.s1, (c) => c.query("update public.profiles set league_visible = false where id = $1", [u.s1]));
    const hidden = await db.as(u.s2, async (c) => (await c.query("select name from public.get_halaqa_league($1, 'all')", [halaqaId])).rows);
    expect(hidden.map((r) => r.name)).toContain("مشارك");
    const teacherView = await db.as(u.teacher, async (c) => (await c.query("select name from public.get_halaqa_league($1, 'all')", [halaqaId])).rows);
    expect(teacherView.map((r) => r.name)).toContain("أحمد");
    await db.as(u.teacher, (c) => c.query("update public.halaqat set league_enabled = false where id = $1", [halaqaId]));
    expect(await db.as(u.s2, async (c) => (await c.query("select * from public.get_halaqa_league($1)", [halaqaId])).rowCount)).toBe(0);
  });
});

describe("reactions", () => {
  it("staff and parents can react to approved records; strangers cannot; the student is notified", async () => {
    const rec = await recite(u.s1);
    const code = await db.as(u.s1, async (c) => (await c.query("select public.create_parent_link_code() as c")).rows[0].c);
    await db.as(u.parent, (c) => c.query("select public.redeem_parent_link_code($1, 'father')", [code]));
    await db.as(u.parent, (c) => c.query("insert into public.reactions (user_id, entity_type, entity_id, kind) values ($1, 'progress_record', $2, 'mashallah')", [u.parent, rec]));
    await db.as(u.teacher, (c) => c.query("insert into public.reactions (user_id, entity_type, entity_id, kind) values ($1, 'progress_record', $2, 'star')", [u.teacher, rec]));
    await expect(db.as(u.outsider, (c) => c.query("insert into public.reactions (user_id, entity_type, entity_id, kind) values ($1, 'progress_record', $2, 'clap')", [u.outsider, rec]))).rejects.toThrow(/row-level security/);
    const seen = await db.as(u.s1, async (c) => (await c.query("select kind from public.reactions where entity_id = $1 order by kind", [rec])).rows);
    expect(seen.map((r) => r.kind).sort()).toEqual(["mashallah", "star"]);
    expect(await db.as(u.outsider, async (c) => (await c.query("select * from public.reactions")).rowCount)).toBe(0);
    const notes = await db.as(u.s1, async (c) => (await c.query("select title from public.notifications where kind = 'reaction.added'")).rows);
    expect(notes).toHaveLength(2);
  });
});

describe("statistics", () => {
  it("weekly series for the student and the halaqa, admin overview gated", async () => {
    const s = await db.as(u.s1, async (c) => (await c.query("select public.get_student_stats($1, 8) as s", [u.s1])).rows[0].s);
    expect(s).toHaveLength(8);
    expect(s[7].new_ayat).toBeGreaterThan(0);
    await expect(db.as(u.s2, (c) => c.query("select public.get_student_stats($1)", [u.s1]))).rejects.toThrow(/صلاحية/);
    const h = await db.as(u.teacher, async (c) => (await c.query("select public.get_halaqa_stats($1, 4) as h", [halaqaId])).rows[0].h);
    expect(h.active_students).toBe(2);
    expect(h.weeks[3].sessions).toBe(1);
    await expect(db.as(u.s1, (c) => c.query("select public.get_halaqa_stats($1)", [halaqaId]))).rejects.toThrow(/صلاحية/);
    await expect(db.as(u.teacher, (c) => c.query("select public.admin_platform_stats()"))).rejects.toThrow(/صلاحية/);
  });
});

describe("push plumbing", () => {
  it("subscriptions are per user; a claim token works once and exposes only that user's devices", async () => {
    await db.sql("insert into private.app_settings values ('vapid_public', 'PUB'), ('vapid_private', 'PRIV')");
    await db.as(u.s1, (c) => c.query("select public.save_push_subscription('https://push.example/1', 'k', 'a', 'test')"));
    await db.as(u.s2, (c) => c.query("select public.save_push_subscription('https://push.example/2', 'k', 'a')"));
    expect(await db.as(u.s1, async (c) => (await c.query("select * from public.push_subscriptions")).rowCount)).toBe(1);
    expect(await db.as(null, async (c) => (await c.query("select public.get_vapid_public_key() k")).rows[0].k)).toBe("PUB");
    const n = await db.sql<{ id: string }>("select id from public.notifications where user_id = $1 limit 1", [u.s1]);
    await db.sql("insert into private.push_outbox (token, notification_id) values ('tok123', $1)", [n[0].id]);
    const claim = await db.as(null, async (c) => (await c.query("select public.claim_push('tok123') as p")).rows[0].p);
    expect(claim.subscriptions).toEqual([{ endpoint: "https://push.example/1", p256dh: "k", auth: "a" }]);
    expect(claim.vapid_private).toBe("PRIV");
    expect(await db.as(null, async (c) => (await c.query("select public.claim_push('tok123') as p")).rows[0].p)).toBeNull();
    expect(await db.as(null, async (c) => (await c.query("select public.claim_push('guess') as p")).rows[0].p)).toBeNull();
    // Pruning only touches the claimed user's devices.
    await db.as(null, (c) => c.query("select public.prune_push_subscription('tok123', 'https://push.example/2')"));
    expect((await db.sql("select * from public.push_subscriptions")).length).toBe(2);
    await db.as(null, (c) => c.query("select public.prune_push_subscription('tok123', 'https://push.example/1')"));
    expect((await db.sql("select * from public.push_subscriptions")).length).toBe(1);
    // Anonymous visitors still cannot read the settings table.
    await expect(db.as(null, (c) => c.query("select * from private.app_settings"))).rejects.toThrow(/permission denied/);
  });
});
