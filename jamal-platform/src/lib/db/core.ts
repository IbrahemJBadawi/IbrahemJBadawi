/**
 * Database core — framework-agnostic (used by Next.js server code and by
 * Node scripts). Two drivers behind one tiny interface:
 *   - DATABASE_URL set   → postgres.js (Supabase Postgres or any Postgres)
 *   - DATABASE_URL unset → PGlite (embedded Postgres, stored in .data/pglite)
 *
 * Demo runtime: on Vercel without DATABASE_URL the filesystem is read-only, so
 * PGlite runs in memory and is filled with the marked demo catalog on every
 * cold start. Nothing persists there — it is a showcase, not a store.
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

/** DATABASE_URL, or POSTGRES_URL as set by the Vercel ↔ Supabase integration. */
export function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

export function isDemoRuntime() {
  return !databaseUrl() && (process.env.JAMAL_DEMO === "1" || Boolean(process.env.VERCEL));
}

export function projectRoot() {
  return process.env.JAMAL_ROOT || process.cwd();
}

async function createPglite(): Promise<Database> {
  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir =
    process.env.PGLITE_DATA_DIR || (isDemoRuntime() ? "memory://" : path.join(projectRoot(), ".data", "pglite"));
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
  if (isDemoRuntime()) await bootstrapDemo(db);
  return db;
}

/**
 * Optional first-run bank details from the environment (BANK_*), written only
 * while the admin hasn't entered any yet; afterwards the admin settings win.
 * Never used by demo deployments, so real account details never sit next to
 * demo products.
 */
async function applyEnvPaymentDefaults(db: Database) {
  const details = process.env.BANK_TRANSFER_DETAILS?.trim();
  if (!details) return;
  await db.transaction((tx) =>
    tx.query(
      `update public.payment_settings set bank_transfer_enabled = true, beneficiary_name = $1, bank_name = $2,
         transfer_details = $3, instructions = coalesce($4, instructions)
       where id = 1 and beneficiary_name is null and transfer_details is null`,
      [process.env.BANK_BENEFICIARY_NAME?.trim() || null, process.env.BANK_NAME?.trim() || null, details, process.env.BANK_INSTRUCTIONS?.trim() || null],
    ),
  );
}

/**
 * The store owner's admin account, from ADMIN_EMAIL.
 * - Supabase Auth: the account is promoted only once its e-mail is confirmed,
 *   so nobody can claim the address first.
 * - Local auth: with ADMIN_PASSWORD the account is created if missing; an
 *   existing account is promoted only if that password matches it.
 */
export async function ensureAdmin(db: Database) {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) return;
  await db.transaction(async (tx) => {
    const [{ supabase }] = await tx.query<{ supabase: boolean }>(
      `select exists (select 1 from information_schema.columns
        where table_schema = 'auth' and table_name = 'users' and column_name = 'email_confirmed_at') as supabase`,
    );
    if (supabase) {
      await tx.query(
        `update public.profiles p set role = 'admin' from auth.users u
         where u.id = p.id and lower(u.email) = $1 and u.email_confirmed_at is not null and p.role <> 'admin'`,
        [email],
      );
      return;
    }
    const pw = process.env.ADMIN_PASSWORD;
    if (!pw || pw.length < 10) return;
    const bcrypt = (await import("bcryptjs")).default;
    const [u] = await tx.query<{ id: string; encrypted_password: string | null }>(
      "select id, encrypted_password from auth.users where lower(email) = $1",
      [email],
    );
    let id = u?.id;
    if (!u) {
      [{ id }] = await tx.query<{ id: string }>(
        `insert into auth.users (email, encrypted_password, raw_user_meta_data)
         values ($1, $2, '{"full_name":"مدير المتجر"}'::jsonb) returning id`,
        [email, await bcrypt.hash(pw, 12)],
      );
    } else if (!u.encrypted_password || !(await bcrypt.compare(pw, u.encrypted_password))) {
      console.warn("ADMIN_EMAIL already belongs to an account with a different password; not promoting it.");
      return;
    }
    await tx.query("update public.profiles set role = 'admin' where id = $1 and role <> 'admin'", [id]);
  });
}

async function bootstrapDemo(db: Database) {
  const { seedDemo } = await import("../demo/seed");
  await db.transaction(async (tx) => {
    await seedDemo(tx);
    // Optional demo admin, only when the deployer sets a password in the environment.
    const pw = process.env.DEMO_ADMIN_PASSWORD;
    if (pw && pw.length >= 10) {
      const bcrypt = (await import("bcryptjs")).default;
      const [u] = await tx.query<{ id: string }>(
        `insert into auth.users (email, encrypted_password, raw_user_meta_data)
         values ('admin@jamal.demo', $1, '{"full_name":"مدير تجريبي"}'::jsonb)
         on conflict (email) do update set encrypted_password = excluded.encrypted_password returning id`,
        [await bcrypt.hash(pw, 10)],
      );
      await tx.query("update public.profiles set role = 'admin' where id = $1", [u.id]);
    }
  });
}

/**
 * Integrations append extras (e.g. Supabase's `supa=…`) that Postgres would
 * reject as unknown settings: keep only what the driver understands.
 */
function cleanUrl(raw: string) {
  try {
    const u = new URL(raw);
    const ssl = u.searchParams.get("sslmode");
    u.search = "";
    return { url: u.toString(), ssl: ssl && ssl !== "disable" ? ("require" as const) : u.hostname === "localhost" || u.hostname === "127.0.0.1" ? false : ("require" as const) };
  } catch {
    return { url: raw, ssl: undefined };
  }
}

async function createPostgres(raw: string): Promise<Database> {
  const postgres = (await import("postgres")).default;
  const { url, ssl } = cleanUrl(raw);
  const sql = postgres(url, {
    ssl,
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
    const url = databaseUrl();
    g.__jamalDb = (url ? createPostgres(url) : createPglite()).then(async (db) => {
      if (url && process.env.JAMAL_AUTO_MIGRATE !== "0") await runMigrations(db);
      if (!isDemoRuntime()) {
        await applyEnvPaymentDefaults(db);
        await ensureAdmin(db);
      }
      return db;
    });
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

  // Several server instances may start together: migrations take turns.
  const lock = "select pg_advisory_xact_lock(724519)";
  await db.transaction(async (tx) => {
    await tx.query(lock);
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
      await tx.query(lock);
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
