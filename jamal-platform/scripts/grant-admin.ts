/**
 * Promote an existing account to admin (the account must sign up first).
 *   npm run admin:grant -- you@example.com
 * With PGlite (no DATABASE_URL) stop `npm run dev` first: the embedded
 * database can only be opened by one process at a time.
 */
import { getDatabase, withContext } from "../src/lib/db/core";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error("Usage: npm run admin:grant -- email@example.com");
  const rows = await withContext({ role: "system" }, (tx) =>
    tx.query<{ id: string }>(
      `update public.profiles p set role = 'admin'
       from auth.users u where u.id = p.id and lower(u.email) = $1 returning p.id`,
      [email],
    ),
  );
  if (!rows.length) throw new Error(`No account found for ${email}. Register it on the site first.`);
  await withContext({ role: "system" }, (tx) =>
    tx.query("insert into public.audit_log (actor_id, action, entity, entity_id, details) values (null, 'grant_admin_cli', 'profile', $1, $2::text::jsonb)", [rows[0].id, JSON.stringify({ email })]),
  );
  console.log(`✔ ${email} is now an admin.`);
  await (await getDatabase()).close();
}

main().catch(async (e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
