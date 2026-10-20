/**
 * اختبار تكامل حقيقي: supabase-js ← PostgREST ← Postgres (بالمخطط وسياسات RLS نفسها).
 * يتطلب: قاعدة qo_int مهيأة و PostgREST يعمل (انظر scripts/test-integration.sh).
 * يُشغَّل فقط عند ضبط INTEGRATION=1.
 */
import { execFileSync } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const REST = process.env.PGRST_URL ?? "http://localhost:3300";
const SECRET = process.env.PGRST_JWT_SECRET ?? "local-test-secret-local-test-secret-123456";
const run = process.env.INTEGRATION === "1";

function psql(sql: string): string {
  return execFileSync("psql", ["-qtAX", "-d", process.env.PGDATABASE ?? "qo_int", "-c", sql], { encoding: "utf8" }).trim();
}

function jwt(sub: string | null): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const body = b64({ role: sub ? "authenticated" : "anon", ...(sub ? { sub } : {}), exp: Math.floor(Date.now() / 1000) + 3600 });
  const head = b64({ alg: "HS256", typ: "JWT" });
  const sig = createHmac("sha256", SECRET).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}

function client(sub: string | null): SupabaseClient {
  return createClient("http://local.test", "anon-key", {
    accessToken: async () => jwt(sub),
    global: {
      fetch: (input, init) => {
        const url = String(input instanceof Request ? input.url : input).replace("http://local.test/rest/v1", REST);
        const headers = new Headers(init?.headers);
        headers.set("Authorization", `Bearer ${jwt(sub)}`);
        return fetch(url, { ...init, headers });
      },
    },
  });
}

describe.runIf(run)("Supabase: المزامنة والصلاحيات", () => {
  const A = randomUUID();
  const B = randomUUID();

  beforeAll(() => {
    // بيئة متصفح دنيا لطبقة المزامنة
    const g = globalThis as Record<string, unknown>;
    g.window = new EventTarget();
    g.document = Object.assign(new EventTarget(), { visibilityState: "visible" });
    psql(`insert into auth.users (id, email, raw_user_meta_data) values ('${A}', 'a-${A}@t.test', '{"display_name":"أ"}'), ('${B}', 'b-${B}@t.test', '{}')`);
  });

  it("ينقل بيانات الزائر إلى الحساب ويرفع التعديلات", async () => {
    const { replaceState, getState } = await import("@/lib/store/store");
    const { emptyState } = await import("@/lib/store/defaults");
    const { startSync, flush, stopSync } = await import("@/lib/store/sync");
    const actions = await import("@/lib/store/actions");

    const guest = emptyState();
    guest.readingLog["2026-10-16"] = [[1, 7]];
    replaceState(guest);
    actions.toggleFavorite(2, 255);

    await startSync(client(A), A);
    expect(getState().ownerId).toBe(A);
    expect(psql(`select data::text from public.user_documents where user_id='${A}' and key='readingLog'`)).toContain("[1, 7]");
    expect(psql(`select data::text from public.user_documents where user_id='${A}' and key='bookmarks'`)).toContain("fav:2:255");

    actions.setDhikrCount("m-subhan", 42);
    await flush(); // يُفرغ ما تجمّع بعد المهلة
    await new Promise((r) => setTimeout(r, 1700));
    await flush();
    expect(psql(`select data::text from public.user_documents where user_id='${A}' and key='adhkarLog'`)).toContain('"c": 42');

    // تسجيل الخروج يمسح البيانات المحلية، وتسجيل الدخول يستعيدها من الحساب
    await stopSync({ clearLocal: true });
    expect(getState().bookmarks).toEqual({});
    await startSync(client(A), A);
    expect(getState().bookmarks["fav:2:255"]).toBeTruthy();
    expect(getState().readingLog["2026-10-16"]).toEqual([[1, 7]]);

    // مستخدم آخر على الجهاز نفسه لا يرث بيانات الأول
    await stopSync({ clearLocal: false });
    await startSync(client(B), B);
    expect(getState().bookmarks).toEqual({});
    await stopSync({ clearLocal: true });
  });

  it("لا يرى مستخدم بيانات غيره ولا يكتب باسمه", async () => {
    const b = client(B);
    const { data } = await b.from("user_documents").select("key").eq("user_id", A);
    expect(data).toEqual([]);
    const { error } = await b.from("user_documents").upsert({ user_id: A, key: "settings", data: {} });
    expect(error?.message).toMatch(/row-level security/);
    const self = await b.from("profiles").update({ role: "admin" }).eq("id", B);
    expect(self.error?.message).toMatch(/غير مسموح بتغيير الدور/);
  });

  it("الزائر يقرأ المحتوى المنشور فقط ولا يعدّله", async () => {
    const anon = client(null);
    const { data } = await anon.from("adhkar").select("id").eq("category_id", "morning");
    expect(data?.length).toBe(17);
    const upd = await anon.from("adhkar").update({ body: "x" }).eq("id", "m-subhan").select();
    expect(upd.data ?? []).toEqual([]);
    const docs = await anon.from("user_documents").select("*");
    expect(docs.data ?? []).toEqual([]);
  });

  it("الدوال الإدارية للمدير فقط", async () => {
    const a = client(A);
    expect((await a.rpc("admin_stats")).error).toBeTruthy();
    psql(`select public.promote_to_admin('a-${A}@t.test')`);
    const stats = await a.rpc("admin_stats");
    expect(stats.error).toBeNull();
    expect((stats.data as Record<string, number>).users_total).toBeGreaterThanOrEqual(2);
    const users = await a.rpc("admin_list_users", { search: "t.test", lim: 10, off: 0 });
    expect(users.data?.length).toBeGreaterThanOrEqual(2);
    const ins = await a.from("oasis_moments").insert({ surah: 1, ayah_from: 1, ayah_to: 1, status: "draft" }).select("id");
    expect(ins.error).toBeNull();
  });

  it("حذف الحساب يحذف كل بياناته", async () => {
    const a = client(A);
    const { error } = await a.rpc("delete_my_account");
    // A هو المدير الوحيد في هذا الاختبار؟ قد يوجد مديرون من اختبارات سابقة
    if (error) expect(error.message).toMatch(/آخر مدير/);
    const b = client(B);
    await b.from("user_documents").upsert({ user_id: B, key: "settings", data: {} });
    expect((await b.rpc("delete_my_account")).error).toBeNull();
    expect(psql(`select count(*) from auth.users where id='${B}'`)).toBe("0");
    expect(psql(`select count(*) from public.user_documents where user_id='${B}'`)).toBe("0");
  });
});
