/** Verification ✓, certificates, support tickets, streaks, students table. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type Db } from "./harness";

let db: Db;
const u: Record<string, string> = {};
let halaqaId = "";

beforeAll(async () => {
  db = await createTestDb();
  u.teacher = await db.createUser({ email: "t@e.local", name: "المحفظ سالم", roles: ["quran_teacher"] });
  u.other = await db.createUser({ email: "o@e.local", name: "محفظ آخر", roles: ["quran_teacher"] });
  u.student = await db.createUser({ email: "s@e.local", name: "يوسف أحمد", roles: ["student"] });
  u.student2 = await db.createUser({ email: "s2@e.local", name: "طالب غريب", roles: ["student"] });
  u.admin = await db.createUser({ email: "admin@e.local", name: "مدير" });
  await db.sql("select private.bootstrap_platform_admin('admin@e.local')");
  halaqaId = await db.as(u.teacher, async (c) =>
    (await c.query("insert into public.halaqat (name, teacher_id, status, join_policy) values ('حلقة', $1, 'published', 'open') returning id", [u.teacher])).rows[0].id,
  );
  await db.as(u.student, (c) => c.query("select public.request_join_halaqa($1)", [halaqaId]));
});
afterAll(async () => { await db?.close(); });

describe("teacher verification", () => {
  it("teacher requests, cannot self-verify, admin approves and ✓ appears publicly", async () => {
    await expect(db.as(u.student, (c) => c.query("select public.submit_teacher_verification($1)", ["إجازة في رواية حفص عن عاصم بالسند"]))).rejects.toThrow(/التوثيق متاح/);
    await db.as(u.teacher, (c) => c.query("select public.submit_teacher_verification($1)", ["إجازة في رواية حفص عن عاصم بالسند المتصل"]));
    await expect(db.as(u.teacher, (c) => c.query("update public.profiles set verified_teacher_at = now() where id = $1", [u.teacher]))).rejects.toThrow(/permission denied|إدارة المنصة/);
    await expect(db.as(u.teacher, (c) => c.query("select public.admin_review_verification(id, true) from public.verification_requests"))).rejects.toThrow(/صلاحية/);
    const reqId = (await db.sql<{ id: string }>("select id from public.verification_requests"))[0].id;
    await db.as(u.admin, (c) => c.query("select public.admin_review_verification($1, true, 'تم التحقق')", [reqId]));
    const pub = await db.as(null, async (c) => (await c.query("select teacher_verified from public.get_public_halaqa($1)", [halaqaId])).rows[0]);
    expect(pub.teacher_verified).toBe(true);
  });
});

describe("certificates", () => {
  let serial = "";
  it("staff issue certificates only to their active students", async () => {
    await expect(db.as(u.other, (c) => c.query("select public.issue_certificate($1, $2, 'juz_completion', 'إتمام جزء عم')", [u.student, halaqaId]))).rejects.toThrow(/صلاحية/);
    await expect(db.as(u.teacher, (c) => c.query("select public.issue_certificate($1, $2, 'juz_completion', 'إتمام جزء عم')", [u.student2, halaqaId]))).rejects.toThrow(/ليس عضوًا/);
    serial = await db.as(u.teacher, async (c) => (await c.query("select public.issue_certificate($1, $2, 'juz_completion', 'إتمام حفظ جزء عم', 'Juz Amma memorization') as s", [u.student, halaqaId])).rows[0].s);
    expect(serial).toMatch(/^HQ-\d{4}-[A-Z0-9]{8}$/);
  });

  it("anyone can verify; the holder's name is masked unless they opt in", async () => {
    const before = await db.as(null, async (c) => (await c.query("select * from public.verify_certificate($1)", [serial.toLowerCase()])).rows[0]);
    expect(before).toMatchObject({ is_valid: true, holder_name: "ي***", teacher_verified: true });
    const certId = (await db.sql<{ id: string }>("select id from public.certificates where serial = $1", [serial]))[0].id;
    await expect(db.as(u.student2, (c) => c.query("select public.set_certificate_name_visibility($1, true)", [certId]))).rejects.toThrow(/غير موجودة/);
    await db.as(u.student, (c) => c.query("select public.set_certificate_name_visibility($1, true)", [certId]));
    const after = await db.as(null, async (c) => (await c.query("select holder_name from public.verify_certificate($1)", [serial])).rows[0]);
    expect(after.holder_name).toBe("يوسف أحمد");
    expect(await db.as(u.student2, async (c) => (await c.query("select * from public.certificates")).rowCount)).toBe(0);
    await db.as(u.teacher, (c) => c.query("select public.revoke_certificate($1, 'صدرت بالخطأ')", [certId]));
    const revoked = await db.as(null, async (c) => (await c.query("select is_valid from public.verify_certificate($1)", [serial])).rows[0]);
    expect(revoked.is_valid).toBe(false);
  });
});

describe("support tickets", () => {
  it("users see only their tickets; admins reply and the user is notified", async () => {
    const id = await db.as(u.student, async (c) => (await c.query("select public.create_support_ticket('report_abuse', 'محتوى غير لائق', 'وصف حلقة يحتوي على عنوان سكن طالب', '/halaqat/x') as id")).rows[0].id);
    expect(await db.as(u.student2, async (c) => (await c.query("select * from public.support_tickets")).rowCount)).toBe(0);
    await expect(db.as(u.student, (c) => c.query("select public.admin_update_ticket($1, 'resolved')", [id]))).rejects.toThrow(/صلاحية/);
    await db.as(u.admin, (c) => c.query("select public.admin_update_ticket($1, 'resolved', 'تم حذف العنوان، شكرًا لك')", [id]));
    const notes = await db.as(u.student, async (c) => (await c.query("select kind from public.notifications where kind = 'ticket.updated'")).rowCount);
    expect(notes).toBe(1);
  });
});

describe("streak and students table", () => {
  it("counts consecutive active weeks and exposes the table only to staff", async () => {
    const sessionId = await db.as(u.teacher, async (c) => (await c.query("insert into public.quran_sessions (halaqa_id, starts_at) values ($1, now()) returning id", [halaqaId])).rows[0].id);
    await db.as(u.teacher, (c) => c.query("select public.save_attendance($1, $2)", [sessionId, JSON.stringify([{ student_id: u.student, status: "present" }])]));
    await db.as(u.teacher, (c) => c.query("select public.record_recitation($1)", [JSON.stringify({
      student_id: u.student, halaqa_id: halaqaId, activity: "new_memorization", surah_from: 114, ayah_from: 1, surah_to: 114, ayah_to: 6,
      completion: "completed", mastery_score: 5, recorded_on: new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10),
    })]));
    expect(await db.as(u.student, async (c) => (await c.query("select public.get_student_streak($1) as n", [u.student])).rows[0].n)).toBe(2);
    await expect(db.as(u.student2, (c) => c.query("select public.get_student_streak($1)", [u.student]))).rejects.toThrow(/صلاحية/);

    const rows = await db.as(u.teacher, async (c) => (await c.query("select * from public.get_halaqa_student_table($1)", [halaqaId])).rows);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "يوسف أحمد", memorized_ayat: "6", sessions_attended: "1" });
    await expect(db.as(u.other, (c) => c.query("select * from public.get_halaqa_student_table($1)", [halaqaId]))).rejects.toThrow(/صلاحية/);
    await expect(db.as(u.student, (c) => c.query("select * from public.get_halaqa_student_table($1)", [halaqaId]))).rejects.toThrow(/صلاحية/);
  });
});
