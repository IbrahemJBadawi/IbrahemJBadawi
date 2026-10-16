/** Structural guarantees: RLS everywhere, no anonymous table access, Quran data intact. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SURAHS } from "@/lib/quran/surahs";
import { createTestDb, type Db } from "./harness";

let db: Db;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });

describe("schema guarantees", () => {
  it("every table in public has row level security enabled", async () => {
    const rows = await db.sql<{ relname: string }>(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    );
    expect(rows).toEqual([]);
  });

  it("anonymous role can read only the surah reference table", async () => {
    const rows = await db.sql<{ table_name: string; privilege_type: string }>(
      `select table_name, privilege_type from information_schema.role_table_grants
       where grantee = 'anon' and table_schema = 'public' order by 1, 2`,
    );
    expect(rows).toEqual([{ table_name: "quran_surahs", privilege_type: "SELECT" }]);
  });

  it("anonymous role can execute only the public browse functions", async () => {
    const rows = await db.sql<{ proname: string }>(
      `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute') order by 1`,
    );
    expect(rows.map((r) => r.proname)).toEqual(["claim_push", "get_public_centers", "get_public_halaqa", "get_public_halaqat", "get_public_teachers", "get_vapid_public_key", "prune_push_subscription", "verify_certificate"]);
  });

  it("every security definer function pins its search_path", async () => {
    const rows = await db.sql<{ proname: string }>(
      `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname in ('public', 'private') and p.prosecdef
         and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')`,
    );
    expect(rows).toEqual([]);
  });

  it("the database surah table matches the app's reference list", async () => {
    const rows = await db.sql<{ number: number; name_ar: string; ayah_count: number }>("select number, name_ar, ayah_count from public.quran_surahs order by number");
    expect(rows.map((r) => [r.number, r.name_ar, r.ayah_count])).toEqual(SURAHS.map((s) => [s.number, s.name, s.ayahCount]));
  });
});
