import "server-only";
import { requireAdmin, type CurrentUser } from "@/lib/auth";
import { asUser, type Tx } from "@/lib/db";

/**
 * Run admin work as the admin user: the server checks the role first and
 * every statement then passes through RLS policies that require is_admin().
 */
export async function withAdmin<T>(fn: (tx: Tx, admin: CurrentUser) => Promise<T>): Promise<T> {
  const admin = await requireAdmin();
  return asUser(admin, (tx) => fn(tx, admin));
}

export async function audit(
  tx: Tx,
  admin: CurrentUser,
  action: string,
  entity: string,
  entityId: string | null,
  details: Record<string, unknown> = {},
) {
  await tx.query(
    "insert into public.audit_log (actor_id, action, entity, entity_id, details) values ($1, $2, $3, $4, $5::text::jsonb)",
    [admin.id, action, entity, entityId, JSON.stringify(details)],
  );
}
