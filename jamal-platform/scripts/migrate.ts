/**
 * Apply SQL migrations from supabase/migrations to the configured database.
 *   - No DATABASE_URL → local PGlite database in .data/pglite
 *   - DATABASE_URL    → that Postgres (for Supabase you may also use `supabase db push`)
 * Usage: npm run db:migrate
 */
import { getDatabase, runMigrations } from "../src/lib/db/core";

async function main() {
  const db = await getDatabase(); // PGlite applies migrations on open
  if (db.kind === "postgres") await runMigrations(db, true);
  console.log(`migrations up to date (${db.kind})`);
  await db.close();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
