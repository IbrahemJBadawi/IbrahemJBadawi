/**
 * Test harness: builds a throwaway database from the local Supabase shim
 * plus the real migrations, then runs statements as specific users with
 * the same role/JWT mechanics Supabase uses (role `authenticated`,
 * `request.jwt.claims`). RLS is therefore exercised for real.
 */
import { Client } from "pg";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const ADMIN_URL = process.env.TEST_DATABASE_ADMIN_URL ?? "postgres://postgres:postgres@localhost:5432/postgres";
const ROOT = path.resolve(__dirname, "../..");

export type Db = {
  admin: Client;
  dbName: string;
  createUser: (opts: { email: string; name?: string; roles?: string[] }) => Promise<string>;
  as: <T>(userId: string | null, fn: (c: Client) => Promise<T>) => Promise<T>;
  sql: <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>;
  close: () => Promise<void>;
};

function withDb(url: string, db: string) {
  const u = new URL(url);
  u.pathname = `/${db}`;
  return u.toString();
}

export async function createTestDb(): Promise<Db> {
  const dbName = `halaqati_test_${process.pid}_${Date.now()}`;
  const root = new Client({ connectionString: ADMIN_URL });
  await root.connect();
  await root.query(`create database ${dbName}`);
  await root.end();

  const admin = new Client({ connectionString: withDb(ADMIN_URL, dbName) });
  await admin.connect();
  await admin.query(readFileSync(path.join(ROOT, "supabase/tests/local-supabase-shim.sql"), "utf8"));
  const dir = path.join(ROOT, "supabase/migrations");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await admin.query(readFileSync(path.join(dir, f), "utf8"));
  }

  const sql = async <T>(text: string, params: unknown[] = []) => (await admin.query(text, params)).rows as T[];

  const createUser: Db["createUser"] = async ({ email, name, roles }) => {
    const meta: Record<string, unknown> = {};
    if (name) meta.full_name = name;
    if (roles) meta.roles = roles;
    const rows = await sql<{ id: string }>(
      `insert into auth.users (email, raw_user_meta_data, email_confirmed_at) values ($1, $2, now()) returning id`,
      [email, JSON.stringify(meta)],
    );
    return rows[0].id;
  };

  // Each call is one "request": a transaction under the caller's identity.
  const as: Db["as"] = async (userId, fn) => {
    await admin.query("begin");
    try {
      await admin.query(`set local role ${userId ? "authenticated" : "anon"}`);
      await admin.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify(userId ? { sub: userId, role: "authenticated" } : { role: "anon" }),
      ]);
      const out = await fn(admin);
      await admin.query("commit");
      return out;
    } catch (e) {
      await admin.query("rollback");
      throw e;
    }
  };

  const close = async () => {
    await admin.end();
    const r = new Client({ connectionString: ADMIN_URL });
    await r.connect();
    await r.query(`drop database if exists ${dbName} with (force)`);
    await r.end();
  };

  return { admin, dbName, createUser, as, sql, close };
}
