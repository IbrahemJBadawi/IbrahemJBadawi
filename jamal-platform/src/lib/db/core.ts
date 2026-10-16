/**
 * Database core — framework-agnostic (used by Next.js server code and by
 * Node scripts). Two drivers behind one tiny interface:
 *   - DATABASE_URL set   → postgres.js (Supabase Postgres or any Postgres)
 *   - DATABASE_URL unset → PGlite (embedded Postgres, stored in .data/pglite)
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

type GlobalWithDb = typeof globalThis & { __jamalDb?: Promise<Database> };

export function projectRoot() {
  return process.env.JAMAL_ROOT || process.cwd();
}

async function createPglite(): Promise<Database> {
  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir =
    process.env.PGLITE_DATA_DIR || path.join(projectRoot(), ".data", "pglite");
  if (dataDir !== "memory://") fs.mkdirSync(dataDir, { recursive: true });
  const pg = new PGlite(dataDir === "memory://" ? undefined : dataDir);
  await pg.waitReady;
  const wrap = (q: {
    query: typeof pg.query;
    exec: typeof pg.exec;
  }): Tx => ({
    async query<T>(text: string, params: unknown[] = []) {
      const res = await q.query<T>(text, params);
      return res.rows;
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
    // Required for Supabase's transaction pooler (port 6543).
    prepare: false,
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
            const rows = await t.unsafe(text, params as never[]);
            return rows as unknown as R[];
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
  if (!g.__jamalDb) {
    const url = process.env.DATABASE_URL;
    g.__jamalDb = url ? createPostgres(url) : createPglite();
    g.__jamalDb.catch(() => {
      g.__jamalDb = undefined;
    });
  }
  return g.__jamalDb;
}

/**
 * Run `fn` inside a transaction with the given security context.
 * anon/authenticated switch to the matching Postgres role so RLS applies.
 */
export async function withContext<T>(
  ctx: DbContext,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  const db = await getDatabase();
  return db.transaction(async (tx) => {
    if (ctx.role !== "system") {
      const claims =
        ctx.role === "authenticated"
          ? { sub: ctx.userId, role: "authenticated", email: ctx.email ?? null }
          : { role: "anon" };
      await tx.query(
        "select set_config('request.jwt.claims', $1, true), set_config('role', $2, true)",
        [JSON.stringify(claims), ctx.role],
      );
    }
    return fn(tx);
  });
}

// ---------------------------------------------------------------------------
// Migrations
// ---------------------------------------------------------------------------

export async function runMigrations(db: Database, log = false) {
  const root = projectRoot();
  const dir = path.join(root, "supabase", "migrations");
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()
    : [];

  await db.transaction(async (tx) => {
    const [{ exists }] = await tx.query<{ exists: boolean }>(
      "select to_regclass('auth.users') is not null as exists",
    );
    if (!exists) {
      // Only for non-Supabase databases (PGlite / plain Postgres).
      await tx.exec(
        fs.readFileSync(path.join(root, "db", "local", "auth_shim.sql"), "utf8"),
      );
      if (log) console.log("applied local auth shim");
    }
    await tx.exec(`
      create schema if not exists app_meta;
      create table if not exists app_meta.migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      );
      revoke all on schema app_meta from public;
    `);
  });

  for (const file of files) {
    await db.transaction(async (tx) => {
      const done = await tx.query(
        "select 1 from app_meta.migrations where name = $1",
        [file],
      );
      if (done.length) return;
      await tx.exec(fs.readFileSync(path.join(dir, file), "utf8"));
      await tx.query("insert into app_meta.migrations (name) values ($1)", [file]);
      if (log) console.log(`applied ${file}`);
    });
  }
}
