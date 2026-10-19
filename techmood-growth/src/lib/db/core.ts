/**
 * Database core — framework-agnostic (used by Next.js server code, scripts
 * and tests). Two drivers behind one tiny interface:
 *   - DATABASE_URL unset → PGlite: an embedded Postgres stored locally in
 *     .data/pglite (zero setup, the default "local storage" mode)
 *   - DATABASE_URL set   → postgres.js (Supabase Postgres or any Postgres)
 * Both run the same migrations, and every request switches to the
 * `anon`/`authenticated` role so Row Level Security applies.
 */
import fs from "node:fs";
import path from "node:path";

export type Row = Record<string, unknown>;

export interface Tx {
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
  /** Run one or more statements without parameters (migrations). */
  exec(text: string): Promise<void>;
}

export interface Database {
  kind: "pglite" | "postgres";
  transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export type DbContext =
  | { role: "anon" }
  | { role: "authenticated"; userId: string; email?: string | null }
  | { role: "system" };

type GlobalWithDb = typeof globalThis & { __growthDb?: Promise<Database> };

export function projectRoot() {
  return process.env.GROWTH_ROOT || process.cwd();
}

/** Serverless hosts (Vercel) have no persistent disk: only /tmp is writable. */
export function isEphemeralHost() {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

function localDataDir() {
  if (process.env.PGLITE_DATA_DIR) return process.env.PGLITE_DATA_DIR;
  if (isEphemeralHost()) return "/tmp/techmood-growth-pglite";
  return path.join(projectRoot(), ".data", "pglite");
}

/**
 * "demo" = local storage on a serverless host: the app works but data is
 * temporary (lost when the instance is recycled). The UI says so plainly.
 */
export function storageMode(): "postgres" | "local" | "demo" {
  if (process.env.DATABASE_URL) return "postgres";
  return isEphemeralHost() ? "demo" : "local";
}

async function createPglite(): Promise<Database> {
  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir = localDataDir();
  const memory = dataDir === "memory://";
  if (!memory) fs.mkdirSync(dataDir, { recursive: true });
  const pg = new PGlite(memory ? undefined : dataDir);
  await pg.waitReady;
  const wrap = (q: { query: typeof pg.query; exec: typeof pg.exec }): Tx => ({
    async query<T>(text: string, params: unknown[] = []) {
      return (await q.query<T>(text, params)).rows;
    },
    async exec(text: string) {
      await q.exec(text);
    },
  });
  // PGlite is single-connection: serialise transactions explicitly.
  let chain: Promise<unknown> = Promise.resolve();
  const db: Database = {
    kind: "pglite",
    transaction<T>(fn: (tx: Tx) => Promise<T>) {
      const run = chain.then(() => pg.transaction((tx) => fn(wrap(tx))));
      chain = run.catch(() => undefined);
      return run;
    },
    close: () => pg.close(),
  };
  await runMigrations(db);
  return db;
}

async function createPostgres(url: string): Promise<Database> {
  const postgres = (await import("postgres")).default;
  const sql = postgres(url, {
    prepare: false, // required by Supabase's transaction pooler
    max: Number(process.env.DATABASE_POOL_MAX || 5),
    idle_timeout: 20,
    onnotice: () => undefined,
  });
  return {
    kind: "postgres",
    async transaction<T>(fn: (tx: Tx) => Promise<T>) {
      const result = await sql.begin(async (t) =>
        fn({
          async query<R>(text: string, params: unknown[] = []) {
            return (await t.unsafe(text, params as never[])) as unknown as R[];
          },
          async exec(text: string) {
            await t.unsafe(text);
          },
        }),
      );
      return result as T;
    },
    close: () => sql.end({ timeout: 5 }),
  };
}

export function getDatabase(): Promise<Database> {
  const g = globalThis as GlobalWithDb;
  if (!g.__growthDb) {
    const url = process.env.DATABASE_URL;
    g.__growthDb = url ? createPostgres(url) : createPglite();
    g.__growthDb.catch(() => {
      g.__growthDb = undefined;
    });
  }
  return g.__growthDb;
}

/** Closes and forgets the shared database (tests and scripts). */
export async function closeDatabase() {
  const g = globalThis as GlobalWithDb;
  if (g.__growthDb) {
    const db = await g.__growthDb.catch(() => null);
    g.__growthDb = undefined;
    await db?.close();
  }
}

/**
 * Runs `fn` in a transaction under a security context. anon/authenticated
 * switch to the matching Postgres role with Supabase-style JWT claims, so
 * auth.uid() and every RLS policy behave exactly as on Supabase.
 */
export async function withContext<T>(ctx: DbContext, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const db = await getDatabase();
  return db.transaction(async (tx) => {
    if (ctx.role !== "system") {
      const claims =
        ctx.role === "authenticated"
          ? { sub: ctx.userId, role: "authenticated", email: ctx.email ?? null }
          : { role: "anon" };
      await tx.query("select set_config('request.jwt.claims', $1, true), set_config('role', $2, true)", [
        JSON.stringify(claims),
        ctx.role,
      ]);
    }
    return fn(tx);
  });
}

export async function runMigrations(db: Database, log = false) {
  const root = projectRoot();
  const dir = path.join(root, "supabase", "migrations");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort() : [];

  await db.transaction(async (tx) => {
    const [{ exists }] = await tx.query<{ exists: boolean }>("select to_regclass('auth.users') is not null as exists");
    if (!exists) {
      // Only for non-Supabase databases (PGlite / plain Postgres).
      await tx.exec(fs.readFileSync(path.join(root, "db", "local", "auth_shim.sql"), "utf8"));
      if (log) console.log("applied local auth shim");
    }
    await tx.exec(`
      create schema if not exists app_meta;
      create table if not exists app_meta.migrations (name text primary key, applied_at timestamptz not null default now());
      revoke all on schema app_meta from public;
    `);
  });

  for (const file of files) {
    await db.transaction(async (tx) => {
      const done = await tx.query("select 1 from app_meta.migrations where name = $1", [file]);
      if (done.length) return;
      await tx.exec(fs.readFileSync(path.join(dir, file), "utf8"));
      await tx.query("insert into app_meta.migrations (name) values ($1)", [file]);
      if (log) console.log(`applied ${file}`);
    });
  }
}
