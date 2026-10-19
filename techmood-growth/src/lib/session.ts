import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { asUser } from "@/lib/db";
import { readSession } from "@/lib/auth";

export const ACTIVE_ORG_COOKIE = "tg_org";

export type Role = "owner" | "admin" | "agent" | "viewer";
export type OrgSummary = { id: string; name: string; role: Role; timezone: string; plan: string };
export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  isPlatformAdmin: boolean;
  organizations: OrgSummary[];
};
export type OrgContext = CurrentUser & { org: OrgSummary };

/** The signed-in user with their companies, read once per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session) return null;
  return asUser(session, async (tx) => {
    const [profile] = await tx.query<{ full_name: string }>("select full_name from public.profiles where id = $1", [session.id]);
    if (!profile) return null;
    const [{ ctx }] = await tx.query<{ ctx: { is_platform_admin: boolean; organizations: OrgSummary[] } }>(
      "select public.get_my_context() as ctx",
    );
    return {
      id: session.id,
      email: session.email,
      fullName: profile.full_name,
      isPlatformAdmin: ctx.is_platform_admin,
      organizations: ctx.organizations ?? [],
    };
  });
});

export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

/**
 * The active company. The cookie only picks among companies the user truly
 * belongs to; every query is still checked by RLS.
 */
export const requireOrg = cache(async (): Promise<OrgContext> => {
  const user = await requireUser("/dashboard");
  if (user.organizations.length === 0) redirect("/onboarding");
  const wanted = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const org = user.organizations.find((o) => o.id === wanted) ?? user.organizations[0];
  return { ...user, org };
});

const RANK: Record<Role, number> = { viewer: 0, agent: 1, admin: 2, owner: 3 };

export function hasRole(role: Role, min: Role) {
  return RANK[role] >= RANK[min];
}

/** UI gate (the database enforces the same rule). */
export async function requireRole(min: Role): Promise<OrgContext> {
  const ctx = await requireOrg();
  if (!hasRole(ctx.org.role, min)) redirect("/dashboard?denied=1");
  return ctx;
}

export async function requirePlatformAdmin(): Promise<CurrentUser> {
  const user = await requireUser("/admin");
  if (!user.isPlatformAdmin) redirect("/dashboard");
  return user;
}
