import { withContext, type Tx } from "@/lib/db/core";

export const sys = <T>(fn: (tx: Tx) => Promise<T>) => withContext({ role: "system" }, fn);
export const anon = <T>(fn: (tx: Tx) => Promise<T>) => withContext({ role: "anon" }, fn);
export const as = <T>(userId: string, fn: (tx: Tx) => Promise<T>, email?: string) =>
  withContext({ role: "authenticated", userId, email }, fn);

let n = 0;
export async function createUser(name = "مستخدم اختبار") {
  const email = `u${++n}_${Date.now()}@test.dev`;
  const [row] = await sys((tx) =>
    tx.query<{ id: string }>(
      "insert into auth.users (email, raw_user_meta_data) values ($1, jsonb_build_object('full_name', $2::text)) returning id",
      [email, name],
    ),
  );
  return { id: row.id, email };
}

export async function createOrg(ownerId: string, name = "شركة اختبار") {
  const [row] = await as(ownerId, (tx) => tx.query<{ id: string }>("select public.create_organization($1, 'Asia/Riyadh') as id", [name]));
  return row.id;
}

/** Adds a member directly (bypasses invitations) for test setup. */
export async function addMember(orgId: string, userId: string, role: "admin" | "agent" | "viewer") {
  await sys((tx) => tx.query("insert into public.organization_members (org_id, user_id, role) values ($1, $2, $3)", [orgId, userId, role]));
}

export async function setPlan(orgId: string, plan: string) {
  await sys((tx) => tx.query("update public.subscriptions set plan_code = $2, status = 'active', current_period_end = now() + interval '30 days' where org_id = $1", [orgId, plan]));
}

export async function createLead(userId: string, orgId: string, fields: Record<string, unknown> = {}) {
  const [row] = await as(userId, (tx) =>
    tx.query<{ id: string }>(
      "insert into public.leads (org_id, full_name, email, phone, source, created_by) values ($1, $2, $3, $4, $5, $6) returning id",
      [orgId, fields.full_name ?? "عميل تجريبي", fields.email ?? null, fields.phone ?? null, fields.source ?? "manual", userId],
    ),
  );
  return row.id;
}
