/** Staff channels (center / organization) and images (profiles, logos, certificates). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type Db } from "./harness";

let db: Db;
const u: Record<string, string> = {};
let org = "";
let center = "";
let otherCenter = "";
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

beforeAll(async () => {
  db = await createTestDb();
  u.owner = await db.createUser({ email: "own@s.local", name: "مدير الدار", roles: ["student"] });
  u.emir = await db.createUser({ email: "emir@s.local", name: "أمير المركز", roles: ["student"] });
  u.teacher = await db.createUser({ email: "t@s.local", name: "محفظ المركز", roles: ["quran_teacher"] });
  u.student = await db.createUser({ email: "st@s.local", name: "طالب", roles: ["student"] });
  u.outsider = await db.createUser({ email: "o@s.local", name: "غريب", roles: ["quran_teacher"] });
  org = (await db.sql<{ id: string }>("insert into public.organizations (name, status) values ('دار الهدى', 'verified') returning id"))[0].id;
  center = (await db.sql<{ id: string }>("insert into public.centers (name, organization_id, status) values ('مركز النور', $1, 'verified') returning id", [org]))[0].id;
  otherCenter = (await db.sql<{ id: string }>("insert into public.centers (name, status) values ('مركز آخر', 'verified') returning id"))[0].id;
  await db.sql("insert into public.organization_memberships (organization_id, user_id, role) values ($1, $2, 'owner')", [org, u.owner]);
  await db.sql("insert into public.center_memberships (center_id, user_id, role) values ($1, $2, 'admin'), ($1, $3, 'teacher')", [center, u.emir, u.teacher]);
  const halaqa = await db.as(u.teacher, async (c) =>
    (await c.query("insert into public.halaqat (name, teacher_id, center_id, status, join_policy) values ('حلقة المركز', $1, $2, 'published', 'open') returning id", [u.teacher, center])).rows[0].id);
  await db.as(u.student, (c) => c.query("select public.request_join_halaqa($1)", [halaqa]));
});
afterAll(async () => { await db?.close(); });

const channels = (who: string) => db.as(who, async (c) => (await c.query("select * from public.get_staff_channels()")).rows);

describe("staff channels", () => {
  it("each adult sees exactly their channels; students see none", async () => {
    expect((await channels(u.owner)).map((c) => `${c.scope}:${c.name}`).sort()).toEqual(["center:مركز النور", "organization:دار الهدى"]);
    expect((await channels(u.emir)).map((c) => `${c.scope}:${c.name}`).sort()).toEqual(["center:مركز النور", "organization:دار الهدى"]);
    expect((await channels(u.teacher)).map((c) => `${c.scope}:${c.name}`)).toEqual(["center:مركز النور"]);
    expect(await channels(u.student)).toHaveLength(0);
    expect(await channels(u.outsider)).toHaveLength(0);
  });

  it("teachers and emirs talk in the center channel; announcements notify; outsiders are refused", async () => {
    await db.as(u.teacher, (c) => c.query("select public.post_staff_message('center', $1, 'نحتاج قاعة للحلقة', true)", [center]));
    expect(await db.sql("select * from public.staff_messages where is_announcement")).toHaveLength(0); // teachers cannot announce
    await db.as(u.emir, (c) => c.query("select public.post_staff_message('center', $1, 'اجتماع المحفّظين الخميس', true)", [center]));
    const n = await db.sql("select user_id from public.notifications where kind = 'staff.announcement'");
    expect(n.map((r) => (r as { user_id: string }).user_id).sort()).toEqual([u.owner, u.teacher].sort());
    const rows = await db.as(u.teacher, async (c) => (await c.query("select * from public.get_staff_messages('center', $1)", [center])).rows);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.author_id === u.emir).author_role).toBe("أمير المركز");
    for (const who of [u.student, u.outsider]) {
      await expect(db.as(who, (c) => c.query("select public.get_staff_messages('center', $1)", [center]))).rejects.toThrow(/لإدارة/);
      await expect(db.as(who, (c) => c.query("select public.post_staff_message('center', $1, 'x')", [center]))).rejects.toThrow(/لإدارة/);
      expect(await db.as(who, async (c) => (await c.query("select * from public.staff_messages")).rowCount)).toBe(0);
    }
    // The teacher is not part of the organization channel; the emir is.
    await expect(db.as(u.teacher, (c) => c.query("select public.post_staff_message('organization', $1, 'x')", [org]))).rejects.toThrow(/لإدارة/);
    await db.as(u.emir, (c) => c.query("select public.post_staff_message('organization', $1, 'تقرير المركز جاهز')", [org]));
    // Only managers pin or delete others' messages.
    const id = rows.find((r) => r.author_id === u.emir).id;
    await expect(db.as(u.teacher, (c) => c.query("select public.delete_staff_message($1)", [id]))).rejects.toThrow(/صلاحية/);
    await expect(db.as(u.teacher, (c) => c.query("select public.pin_staff_message($1, true)", [id]))).rejects.toThrow(/للإدارة/);
    await db.as(u.owner, (c) => c.query("select public.pin_staff_message($1, true)", [id]));
  });
});

describe("images", () => {
  it("owners set their own images; logos need admin rights; bad data is refused", async () => {
    await db.as(u.student, (c) => c.query("select public.set_entity_image('profile', $1, $2)", [u.student, PNG]));
    await expect(db.as(u.student, (c) => c.query("select public.set_entity_image('profile', $1, $2)", [u.teacher, PNG]))).rejects.toThrow(/صلاحية/);
    await expect(db.as(u.teacher, (c) => c.query("select public.set_entity_image('center', $1, $2)", [center, PNG]))).rejects.toThrow(/صلاحية/);
    await db.as(u.emir, (c) => c.query("select public.set_entity_image('center', $1, $2)", [center, PNG]));
    await db.as(u.owner, (c) => c.query("select public.set_entity_image('center', $1, $2)", [center, PNG])); // org admin manages its centers
    await expect(db.as(u.emir, (c) => c.query("select public.set_entity_image('center', $1, $2)", [otherCenter, PNG]))).rejects.toThrow(/صلاحية/);
    await db.as(u.owner, (c) => c.query("select public.set_entity_image('organization', $1, $2)", [org, PNG]));
    await expect(db.as(u.student, (c) => c.query("select public.set_entity_image('profile', $1, 'data:text/html;base64,PHNjcmlwdD4=')", [u.student]))).rejects.toThrow(/غير صالحة/);
    await expect(db.as(u.student, (c) => c.query("select * from private.entity_images"))).rejects.toThrow(/permission denied/);
  });

  it("a student's photo is visible to their circle only", async () => {
    const see = (who: string) => db.as(who, async (c) => (await c.query("select * from public.get_entity_images('profile', $1)", [[u.student]])).rowCount);
    expect(await see(u.student)).toBe(1);
    expect(await see(u.teacher)).toBe(1);
    expect(await see(u.outsider)).toBe(0);
  });

  it("certificates print logos; the student's photo only with their consent", async () => {
    const halaqa = (await db.sql<{ id: string }>("select id from public.halaqat where center_id = $1", [center]))[0].id;
    const serial = await db.as(u.teacher, async (c) => (await c.query(
      "select public.issue_certificate($1, $2, 'surah_completion', 'إتمام سورة الملك') as serial", [u.student, halaqa])).rows[0].serial);
    const anon = async () => db.as(null, async (c) => (await c.query("select public.get_certificate_images($1) as i", [serial])).rows[0].i);
    let imgs = await anon();
    expect(imgs.center).toBe(PNG);
    expect(imgs.organization).toBe(PNG);
    expect(imgs.organization_name).toBe("دار الهدى");
    expect(imgs.student).toBeNull();
    await db.as(u.student, (c) => c.query("update public.profiles set photo_on_certificates = true where id = $1", [u.student]));
    expect((await anon()).student).toBeNull(); // name hidden publicly → photo hidden too
    await db.as(u.student, (c) => c.query("select public.set_certificate_name_visibility((select id from public.certificates where serial = $1), true)", [serial]));
    imgs = await anon();
    expect(imgs.student).toBe(PNG);
  });
});
