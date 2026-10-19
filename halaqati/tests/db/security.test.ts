/**
 * Database-level proof of the platform's core permission rules.
 * Numbers in test names refer to the required test list in docs/TESTING.md.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type Db } from "./harness";

let db: Db;
const u: Record<string, string> = {};

beforeAll(async () => {
  db = await createTestDb();
  u.teacherA = await db.createUser({ email: "teacher.a@test.local", name: "محفظ أ", roles: ["quran_teacher"] });
  u.teacherB = await db.createUser({ email: "teacher.b@test.local", name: "محفظ ب", roles: ["quran_teacher"] });
  u.student1 = await db.createUser({ email: "student1@test.local", name: "طالب واحد", roles: ["student"] });
  u.student2 = await db.createUser({ email: "student2@test.local", name: "طالب اثنان", roles: ["student"] });
  u.parent1 = await db.createUser({ email: "parent1@test.local", name: "ولي أمر واحد", roles: ["parent"] });
  u.parent2 = await db.createUser({ email: "parent2@test.local", name: "ولي أمر اثنان", roles: ["parent"] });
  u.orgAdminA = await db.createUser({ email: "org.a@test.local", name: "مدير دار أ" });
  u.orgAdminB = await db.createUser({ email: "org.b@test.local", name: "مدير دار ب" });
  u.centerAdminB = await db.createUser({ email: "center.b@test.local", name: "أمير مركز ب" });
});

afterAll(async () => {
  await db?.close();
});

const roleList = async (userId: string) =>
  db.as(userId, async (c) => (await c.query("select role from public.user_roles where revoked_at is null order by role")).rows.map((r) => r.role));

describe("accounts and roles", () => {
  it("1. signing up creates a profile the user can read (and default student role)", async () => {
    const id = await db.createUser({ email: "new@test.local", name: "مستخدم جديد" });
    const rows = await db.as(id, async (c) => (await c.query("select id, full_name from public.profiles")).rows);
    expect(rows).toEqual([{ id, full_name: "مستخدم جديد" }]);
    expect(await roleList(id)).toEqual(["student"]);
  });

  it("2. a user can hold several roles at once", async () => {
    const id = await db.createUser({ email: "multi@test.local", name: "متعدد الأدوار", roles: ["student", "quran_teacher"] });
    await db.as(id, (c) => c.query("select public.add_my_role('parent')"));
    expect(await roleList(id)).toEqual(["student", "parent", "quran_teacher"]);
    const ctx = await db.as(id, async (c) => (await c.query("select public.get_my_context() as ctx")).rows[0].ctx);
    expect(ctx.roles).toEqual(["student", "parent", "quran_teacher"]);
  });

  it("13. a regular user cannot grant themselves admin powers", async () => {
    const id = await db.createUser({ email: "sneaky@test.local", name: "محاول", roles: ["student", "platform_admin"] });
    expect(await roleList(id)).toEqual(["student"]);

    await expect(db.as(id, (c) => c.query("select public.add_my_role('platform_admin')"))).rejects.toThrow(/ذاتيًا/);
    await expect(
      db.as(id, (c) => c.query("insert into public.user_roles (user_id, role) values ($1, 'platform_admin')", [id])),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.as(id, (c) => c.query("select public.admin_set_user_role($1, 'platform_admin', true)", [id])),
    ).rejects.toThrow(/صلاحية غير كافية/);
    await expect(
      db.as(id, (c) => c.query("insert into public.organization_memberships (organization_id, user_id, role) select id, $1, 'owner' from public.organizations limit 1", [id])),
    ).rejects.toThrow(/permission denied/);
    expect(await roleList(id)).toEqual(["student"]);
  });

  it("13b. only a platform admin can grant roles, and every grant is audited", async () => {
    const admin = await db.createUser({ email: "admin@test.local", name: "مدير المنصة" });
    await db.sql("select private.bootstrap_platform_admin('admin@test.local')");
    await db.as(admin, (c) => c.query("select public.admin_set_user_role($1, 'instructor', true)", [u.student2]));
    expect(await roleList(u.student2)).toContain("instructor");
    await db.as(admin, (c) => c.query("select public.admin_set_user_role($1, 'instructor', false)", [u.student2]));
    expect(await roleList(u.student2)).not.toContain("instructor");
    const audit = await db.as(admin, async (c) =>
      (await c.query("select action from public.audit_logs where entity_id = $1 order by id", [u.student2])).rows,
    );
    expect(audit.map((a) => a.action)).toEqual(["role.granted", "role.revoked"]);
    // The last platform admin cannot be removed.
    await expect(
      db.as(admin, (c) => c.query("select public.admin_set_user_role($1, 'platform_admin', false)", [admin])),
    ).rejects.toThrow(/آخر مدير/);
  });

  it("users cannot write the audit log or read other people's", async () => {
    await expect(
      db.as(u.student1, (c) => c.query("insert into public.audit_logs (action, entity_type) values ('x', 'y')")),
    ).rejects.toThrow(/permission denied/);
    const rows = await db.as(u.student1, async (c) => (await c.query("select count(*)::int n from public.audit_logs")).rows[0].n);
    expect(rows).toBe(0);
  });

  it("anonymous visitors cannot read tables directly", async () => {
    await expect(db.as(null, (c) => c.query("select * from public.profiles"))).rejects.toThrow(/permission denied/);
    await expect(db.as(null, (c) => c.query("select * from public.halaqat"))).rejects.toThrow(/permission denied/);
    await expect(db.as(null, (c) => c.query("select public.request_join_halaqa(gen_random_uuid())"))).rejects.toThrow(/permission denied/);
  });
});

describe("halaqa workflow", () => {
  let halaqaId: string;
  let membershipId: string;
  let sessionId: string;
  let recordId: string;

  it("3. an independent teacher can create a public halaqa without any center", async () => {
    halaqaId = await db.as(u.teacherA, async (c) => {
      const r = await c.query(
        `insert into public.halaqat (name, teacher_id, join_policy, status, max_students, schedule)
         values ('حلقة الفجر', $1, 'approval', 'published', 10, '[{"day":0,"start":"05:30","duration":60}]')
         returning id, center_id, is_independent`,
        [u.teacherA],
      );
      expect(r.rows[0].center_id).toBeNull();
      expect(r.rows[0].is_independent).toBe(true);
      return r.rows[0].id;
    });
    // The responsible teacher is automatically an active member.
    const m = await db.sql("select role, status from public.halaqa_memberships where halaqa_id = $1", [halaqaId]);
    expect(m).toEqual([{ role: "teacher", status: "active" }]);
    // Visible to anonymous visitors through the public function.
    const pub = await db.as(null, async (c) => (await c.query("select id, teacher_name, active_students from public.get_public_halaqat()")).rows);
    expect(pub).toEqual([{ id: halaqaId, teacher_name: "محفظ أ", active_students: 0 }]);
  });

  it("3b. someone without the teacher role cannot create a halaqa, nor one for another teacher", async () => {
    await expect(
      db.as(u.student1, (c) => c.query("insert into public.halaqat (name, teacher_id) values ('حلقة', $1)", [u.student1])),
    ).rejects.toThrow(/row-level security/);
    await expect(
      db.as(u.teacherB, (c) => c.query("insert into public.halaqat (name, teacher_id) values ('حلقة', $1)", [u.teacherA])),
    ).rejects.toThrow(/row-level security/);
  });

  it("4. a student can request to join a halaqa", async () => {
    const res = await db.as(u.student1, async (c) => (await c.query("select public.request_join_halaqa($1, 'أرغب بالانضمام') as r", [halaqaId])).rows[0].r);
    expect(res.status).toBe("pending");
    membershipId = res.membership_id;
    await expect(
      db.as(u.student1, (c) => c.query("select public.request_join_halaqa($1)", [halaqaId])),
    ).rejects.toThrow(/طلب قائم/);
    const notes = await db.as(u.teacherA, async (c) => (await c.query("select kind from public.notifications")).rows);
    expect(notes.map((n) => n.kind)).toContain("halaqa.join_requested");
    // The teacher can see the applicant's name.
    const names = await db.as(u.teacherA, async (c) => (await c.query("select full_name from public.profiles where id = $1", [u.student1])).rows);
    expect(names).toEqual([{ full_name: "طالب واحد" }]);
  });

  it("5. only staff can decide; the teacher accepts and records a session with attendance", async () => {
    await expect(
      db.as(u.teacherB, (c) => c.query("select public.decide_join_request($1, true)", [membershipId])),
    ).rejects.toThrow(/غير موجود/);
    await expect(
      db.as(u.student1, (c) => c.query("select public.decide_join_request($1, true)", [membershipId])),
    ).rejects.toThrow(/غير موجود/);

    await db.as(u.teacherA, (c) => c.query("select public.decide_join_request($1, true, 'أهلًا بك')", [membershipId]));
    sessionId = await db.as(u.teacherA, async (c) =>
      (await c.query(
        `insert into public.quran_sessions (halaqa_id, starts_at, mode, meeting_url)
         values ($1, now(), 'remote', 'https://meet.example.org/abc') returning id`,
        [halaqaId],
      )).rows[0].id,
    );
    const saved = await db.as(u.teacherA, async (c) =>
      (await c.query("select public.save_attendance($1, $2) as n", [sessionId, JSON.stringify([{ student_id: u.student1, status: "present" }])])).rows[0].n,
    );
    expect(saved).toBe(1);
    // Attendance for someone who is not a member is refused.
    await expect(
      db.as(u.teacherA, (c) => c.query("select public.save_attendance($1, $2)", [sessionId, JSON.stringify([{ student_id: u.student2, status: "present" }])])),
    ).rejects.toThrow(/ليس عضوًا/);
    // Another teacher cannot add sessions to this halaqa.
    await expect(
      db.as(u.teacherB, (c) => c.query("insert into public.quran_sessions (halaqa_id, starts_at) values ($1, now())", [halaqaId])),
    ).rejects.toThrow(/row-level security/);
    // The student sees the session and their attendance.
    const seen = await db.as(u.student1, async (c) => (await c.query("select status from public.attendance_records")).rows);
    expect(seen).toEqual([{ status: "present" }]);
  });

  it("6. the teacher records new memorization and review, with errors and next assignment", async () => {
    const assignmentId = await db.as(u.teacherA, async (c) =>
      (await c.query(
        `insert into public.quran_assignments (halaqa_id, student_id, activity, surah_from, ayah_from, surah_to, ayah_to, due_on)
         values ($1, $2, 'new_memorization', 78, 1, 78, 16, current_date + 3) returning id, ayah_count`,
        [halaqaId, u.student1],
      )).rows[0].id,
    );

    recordId = await db.as(u.teacherA, async (c) =>
      (await c.query("select public.record_recitation($1, $2) as id", [
        JSON.stringify({
          student_id: u.student1, halaqa_id: halaqaId, session_id: sessionId, assignment_id: assignmentId,
          activity: "new_memorization", surah_from: 78, ayah_from: 1, surah_to: 78, ayah_to: 16,
          completion: "completed", mastery_score: 4, recitation_score: 3, plan_adherence: "met",
          teacher_notes: "حفظ جيد، يحتاج إلى ضبط المدود",
        }),
        JSON.stringify([{ error_type: "tajweed", surah: 78, ayah: 6, note: "مد" }]),
      ])).rows[0].id,
    );
    await db.as(u.teacherA, (c) =>
      c.query("select public.record_recitation($1)", [
        JSON.stringify({
          student_id: u.student1, halaqa_id: halaqaId, session_id: sessionId,
          activity: "far_review", surah_from: 112, ayah_from: 1, surah_to: 114, ayah_to: 6,
          completion: "completed", mastery_score: 5, recitation_score: 5,
        }),
      ]),
    );

    const rec = await db.sql<{ ayah_count: number; status: string; approved_by: string }>(
      "select ayah_count, status, approved_by from public.quran_progress_records where id = $1",
      [recordId],
    );
    expect(rec[0]).toMatchObject({ ayah_count: 16, status: "approved", approved_by: u.teacherA });
    const far = await db.sql<{ ayah_count: number }>("select ayah_count from public.quran_progress_records where activity = 'far_review'");
    expect(far[0].ayah_count).toBe(4 + 5 + 6);
    const asg = await db.sql<{ status: string }>("select status from public.quran_assignments where id = $1", [assignmentId]);
    expect(asg[0].status).toBe("completed");

    const overview = await db.as(u.student1, async (c) => (await c.query("select public.get_student_overview($1) as o", [u.student1])).rows[0].o);
    expect(overview.amount.new_memorization_ayat).toBe(16);
    expect(overview.amount.review_ayat_period).toBe(15);
    expect(Number(overview.mastery_avg)).toBe(4.5);
    expect(overview.attendance).toEqual({ present: 1 });
    expect(overview.errors_by_type).toEqual({ tajweed: 1 });

    // Invalid ranges are rejected.
    await expect(
      db.as(u.teacherA, (c) =>
        c.query("select public.record_recitation($1)", [
          JSON.stringify({ student_id: u.student1, halaqa_id: halaqaId, activity: "near_review", surah_from: 1, ayah_from: 1, surah_to: 1, ayah_to: 8, completion: "completed", mastery_score: 3 }),
        ]),
      ),
    ).rejects.toThrow(/خارج حدود السورة/);
  });

  it("6b. approved records are locked: students cannot edit, teacher amendments need a reason and are audited", async () => {
    const updated = await db.as(u.student1, async (c) =>
      (await c.query("update public.quran_progress_records set mastery_score = 5 where id = $1", [recordId])).rowCount,
    );
    expect(updated).toBe(0);
    await expect(
      db.as(u.teacherA, (c) => c.query("update public.quran_progress_records set mastery_score = 5 where id = $1", [recordId])),
    ).rejects.toThrow(/سبب التعديل/);
    const deleted = await db.as(u.teacherA, async (c) =>
      (await c.query("delete from public.quran_progress_records where id = $1", [recordId])).rowCount,
    );
    expect(deleted).toBe(0);
    // Even the table owner cannot delete an approved record (trigger guard).
    await expect(db.sql("delete from public.quran_progress_records where id = $1", [recordId])).rejects.toThrow(/لا يمكن حذف سجل معتمد/);
    await db.as(u.teacherA, (c) =>
      c.query("select public.amend_progress_record($1, $2, $3)", [recordId, JSON.stringify({ mastery_score: 5 }), "خطأ في الإدخال عند التسجيل"]),
    );
    const rec = await db.sql<{ mastery_score: number; revision: number }>("select mastery_score, revision from public.quran_progress_records where id = $1", [recordId]);
    expect(rec[0]).toEqual({ mastery_score: 5, revision: 2 });
    const audit = await db.sql<{ metadata: { reason: string; before: { mastery_score: number } } }>(
      "select metadata from public.audit_logs where action = 'progress.amended' and entity_id = $1",
      [recordId],
    );
    expect(audit[0].metadata.reason).toBe("خطأ في الإدخال عند التسجيل");
    expect(audit[0].metadata.before.mastery_score).toBe(4);
  });

  it("drafts are invisible to the student until approved", async () => {
    const draftId = await db.as(u.teacherA, async (c) =>
      (await c.query("select public.record_recitation($1) as id", [
        JSON.stringify({ student_id: u.student1, halaqa_id: halaqaId, activity: "near_review", surah_from: 78, ayah_from: 1, surah_to: 78, ayah_to: 10, completion: "partial", mastery_score: 2, approve: false }),
      ])).rows[0].id,
    );
    const visible = async () =>
      db.as(u.student1, async (c) => (await c.query("select id from public.quran_progress_records where id = $1", [draftId])).rowCount);
    expect(await visible()).toBe(0);
    await db.as(u.teacherA, (c) => c.query("select public.approve_progress_record($1)", [draftId]));
    expect(await visible()).toBe(1);
  });

  it("7. a student cannot see another student's data", async () => {
    await db.as(u.student2, async (c) => {
      expect((await c.query("select * from public.quran_progress_records")).rowCount).toBe(0);
      expect((await c.query("select * from public.attendance_records")).rowCount).toBe(0);
      expect((await c.query("select * from public.quran_assignments")).rowCount).toBe(0);
      expect((await c.query("select * from public.quran_error_records")).rowCount).toBe(0);
      expect((await c.query("select * from public.profiles where id = $1", [u.student1])).rowCount).toBe(0);
      expect((await c.query("select * from public.profile_details where user_id = $1", [u.student1])).rowCount).toBe(0);
      expect((await c.query("select * from public.halaqa_memberships where user_id = $1", [u.student1])).rowCount).toBe(0);
    });
    await expect(
      db.as(u.student2, (c) => c.query("select public.get_student_overview($1)", [u.student1])),
    ).rejects.toThrow(/لا تملك صلاحية/);
    // Knowing the record id is not enough.
    const byId = await db.as(u.student2, async (c) => (await c.query("select * from public.quran_progress_records where id = $1", [recordId])).rowCount);
    expect(byId).toBe(0);
  });

  it("teachers see a student's overview only for their own halaqa", async () => {
    await expect(
      db.as(u.teacherA, (c) => c.query("select public.get_student_overview($1)", [u.student1])),
    ).rejects.toThrow(/لا تملك صلاحية/);
    const o = await db.as(u.teacherA, async (c) =>
      (await c.query("select public.get_student_overview($1, 30, $2) as o", [u.student1, halaqaId])).rows[0].o,
    );
    expect(o.amount.new_memorization_ayat).toBe(16);
    await expect(
      db.as(u.teacherB, (c) => c.query("select public.get_student_overview($1, 30, $2)", [u.student1, halaqaId])),
    ).rejects.toThrow(/لا تملك صلاحية/);
  });

  it("another teacher cannot see students of a halaqa they do not run", async () => {
    await db.as(u.teacherB, async (c) => {
      expect((await c.query("select * from public.quran_progress_records")).rowCount).toBe(0);
      expect((await c.query("select * from public.profiles where id = $1", [u.student1])).rowCount).toBe(0);
      expect((await c.query("update public.halaqat set name = 'مختطفة' where id = $1", [halaqaId])).rowCount).toBe(0);
    });
  });

  it("8. a parent sees only children linked through the student's one-time code", async () => {
    // Unlinked parent sees nothing.
    await db.as(u.parent2, async (c) => {
      expect((await c.query("select * from public.quran_progress_records")).rowCount).toBe(0);
      expect((await c.query("select * from public.profiles where id = $1", [u.student1])).rowCount).toBe(0);
    });
    await expect(
      db.as(u.parent2, (c) => c.query("select public.get_student_overview($1)", [u.student1])),
    ).rejects.toThrow(/لا تملك صلاحية/);

    // A parent cannot create a link on their own.
    await expect(
      db.as(u.parent1, (c) => c.query("insert into public.parent_student_links (parent_id, student_id, relationship) values ($1, $2, 'father')", [u.parent1, u.student1])),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.as(u.parent1, (c) => c.query("select public.redeem_parent_link_code('WRONGCODE1', 'father')")),
    ).rejects.toThrow(/غير صحيح/);

    const code = await db.as(u.student1, async (c) => (await c.query("select public.create_parent_link_code() as code")).rows[0].code);
    expect(code).toMatch(/^[A-Z2-9]{10}$/);
    // Students never see the stored hash.
    await expect(
      db.as(u.student1, (c) => c.query("select code_hash from public.parent_link_codes")),
    ).rejects.toThrow(/permission denied/);

    await db.as(u.parent1, (c) => c.query("select public.redeem_parent_link_code($1, 'father')", [code.toLowerCase()]));
    // Codes are single-use.
    await expect(
      db.as(u.parent2, (c) => c.query("select public.redeem_parent_link_code($1, 'mother')", [code])),
    ).rejects.toThrow(/غير صحيح/);

    await db.as(u.parent1, async (c) => {
      expect((await c.query("select * from public.quran_progress_records")).rowCount).toBeGreaterThan(0);
      expect((await c.query("select * from public.quran_progress_records where status = 'draft'")).rowCount).toBe(0);
      const o = (await c.query("select public.get_student_overview($1) as o", [u.student1])).rows[0].o;
      expect(o.amount.new_memorization_ayat).toBe(16);
      // Still nothing about the other student.
      expect((await c.query("select * from public.profiles where id = $1", [u.student2])).rowCount).toBe(0);
    });
    await db.as(u.parent2, async (c) => {
      expect((await c.query("select * from public.quran_progress_records")).rowCount).toBe(0);
    });
  });

  it("join requests respect capacity", async () => {
    await db.as(u.teacherA, (c) => c.query("update public.halaqat set max_students = 1 where id = $1", [halaqaId]));
    await expect(
      db.as(u.student2, (c) => c.query("select public.request_join_halaqa($1)", [halaqaId])),
    ).rejects.toThrow(/اكتمل/);
  });
});

describe("institution isolation", () => {
  let orgA: string;
  let orgB: string;
  let centerA: string;
  let centerB: string;

  beforeAll(async () => {
    orgA = await db.as(u.orgAdminA, async (c) => (await c.query("select public.create_organization('دار أ') as id")).rows[0].id);
    orgB = await db.as(u.orgAdminB, async (c) => (await c.query("select public.create_organization('دار ب') as id")).rows[0].id);
    centerA = await db.as(u.orgAdminA, async (c) => (await c.query("select public.create_center('مركز أ١', $1) as id", [orgA])).rows[0].id);
    centerB = await db.as(u.centerAdminB, async (c) => (await c.query("select public.create_center('مركز مستقل ب') as id")).rows[0].id);
  });

  it("9. a center admin cannot manage another center", async () => {
    await db.as(u.centerAdminB, async (c) => {
      expect((await c.query("select * from public.centers where id = $1", [centerA])).rowCount).toBe(0);
      expect((await c.query("update public.centers set name = 'مختطف' where id = $1", [centerA])).rowCount).toBe(0);
      expect((await c.query("select * from public.center_memberships where center_id = $1", [centerA])).rowCount).toBe(0);
      // Own center is manageable.
      expect((await c.query("update public.centers set description = 'وصف' where id = $1", [centerB])).rowCount).toBe(1);
      // But verification status is not.
      await expect(c.query("update public.centers set status = 'verified' where id = $1", [centerB])).rejects.toThrow(/التوثيق/);
    });
    // Cannot create halaqat inside another center, even with the teacher role.
    await db.as(u.centerAdminB, (c) => c.query("select public.add_my_role('quran_teacher')"));
    await expect(
      db.as(u.centerAdminB, (c) => c.query("insert into public.halaqat (name, teacher_id, center_id) values ('حلقة', $1, $2)", [u.centerAdminB, centerA])),
    ).rejects.toThrow(/row-level security/);
    // Can inside own center.
    const ok = await db.as(u.centerAdminB, async (c) =>
      (await c.query("insert into public.halaqat (name, teacher_id, center_id) values ('حلقة المركز', $1, $2) returning id", [u.centerAdminB, centerB])).rowCount,
    );
    expect(ok).toBe(1);
  });

  it("10. an organization admin cannot reach another organization", async () => {
    await db.as(u.orgAdminA, async (c) => {
      expect((await c.query("select * from public.organizations where id = $1", [orgB])).rowCount).toBe(0);
      expect((await c.query("update public.organizations set name = 'مختطفة' where id = $1", [orgB])).rowCount).toBe(0);
      expect((await c.query("select * from public.organization_memberships where organization_id = $1", [orgB])).rowCount).toBe(0);
      expect((await c.query("select * from public.centers where id = $1", [centerB])).rowCount).toBe(0);
      // Own organization's center is manageable through the org admin role.
      expect((await c.query("update public.centers set description = 'فرع' where id = $1", [centerA])).rowCount).toBe(1);
    });
    await expect(
      db.as(u.orgAdminA, (c) => c.query("select public.create_center('فرع مختطف', $1)", [orgB])),
    ).rejects.toThrow(/لا تملك صلاحية/);
  });

  it("pending institutions are hidden from the public directory until verified", async () => {
    const before = await db.as(null, async (c) => (await c.query("select id from public.get_public_centers()")).rows);
    expect(before).toEqual([]);
    const admin = (await db.sql<{ id: string }>("select id from auth.users where email = 'admin@test.local'"))[0].id;
    await db.as(admin, (c) => c.query("select public.admin_set_institution_status('center', $1, 'verified')", [centerB]));
    const after = await db.as(null, async (c) => (await c.query("select id from public.get_public_centers()")).rows);
    expect(after).toEqual([{ id: centerB }]);
  });
});

describe("privacy", () => {
  it("a user can file one open deletion request and see only their own", async () => {
    await db.as(u.student2, (c) => c.query("select public.create_privacy_request('delete', 'لم أعد أستخدم الحساب')"));
    await expect(db.as(u.student2, (c) => c.query("select public.create_privacy_request('delete')"))).rejects.toThrow(/طلب قائم/);
    const others = await db.as(u.student1, async (c) => (await c.query("select * from public.privacy_requests")).rowCount);
    expect(others).toBe(0);
  });
});
