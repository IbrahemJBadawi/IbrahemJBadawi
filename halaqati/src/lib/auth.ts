import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  availableContexts,
  resolveActiveContext,
  type AppRole,
  type ContextKey,
  type MembershipSummary,
} from "@/lib/roles";

export const ACTIVE_CONTEXT_COOKIE = "halaqati_ctx";

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string;
  displayName: string | null;
  roles: AppRole[];
  centers: MembershipSummary[];
  organizations: MembershipSummary[];
  contexts: ContextKey[];
  activeContext: ContextKey | null;
};

/** The signed-in user with roles and memberships, read once per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  await cookies();
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) return null;

  const [ctxRes, profileRes, cookieStore] = await Promise.all([
    supabase.rpc("get_my_context"),
    supabase.from("profiles").select("full_name, display_name").eq("id", claims.sub).maybeSingle(),
    cookies(),
  ]);
  const ctx = (ctxRes.data ?? {}) as {
    roles?: AppRole[];
    centers?: MembershipSummary[];
    organizations?: MembershipSummary[];
  };
  const data = {
    roles: ctx.roles ?? [],
    centers: ctx.centers ?? [],
    organizations: ctx.organizations ?? [],
  };
  const contexts = availableContexts(data);
  return {
    id: claims.sub,
    email: (claims.email as string | undefined) ?? null,
    fullName: profileRes.data?.full_name ?? "",
    displayName: profileRes.data?.display_name ?? null,
    ...data,
    contexts,
    activeContext: resolveActiveContext(cookieStore.get(ACTIVE_CONTEXT_COOKIE)?.value, contexts),
  };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Ensures the user truly holds the context (UI gate; RLS still applies). */
export async function requireContext(context: ContextKey): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.contexts.includes(context)) redirect("/dashboard");
  return user;
}
