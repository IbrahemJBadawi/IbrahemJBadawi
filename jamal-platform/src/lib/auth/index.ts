import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { asUser } from "@/lib/db";
import { localGetSession, localSignIn, localSignOut, localSignUp } from "./local";
import { supabaseGetSession, supabaseSignIn, supabaseSignOut, supabaseSignUp } from "./supabase";
import type { CurrentUser } from "./types";

export type { CurrentUser } from "./types";

export function authProvider(): "supabase" | "local" {
  return process.env.AUTH_PROVIDER === "supabase" ? "supabase" : "local";
}

export const getSession = cache(async () =>
  authProvider() === "supabase" ? supabaseGetSession() : localGetSession(),
);

/** The signed-in user with their profile (role read through RLS), or null. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  if (!session) return null;
  const profile = await asUser(session, async (tx) => {
    const rows = await tx.query<{ full_name: string | null; phone: string | null; role: "customer" | "admin" }>(
      "select full_name, phone, role from public.profiles where id = $1",
      [session.id],
    );
    return rows[0];
  });
  if (!profile) return null;
  return {
    id: session.id,
    email: session.email,
    fullName: profile.full_name,
    phone: profile.phone,
    role: profile.role,
  };
});

export async function requireUser(next = "/account"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** Server-side admin gate. RLS enforces is_admin() again on every query. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  // Non-admins get a 404 so the admin area does not reveal itself.
  if (user.role !== "admin") notFound();
  return user;
}

export function signUp(email: string, password: string, fullName: string) {
  return authProvider() === "supabase"
    ? supabaseSignUp(email, password, fullName)
    : localSignUp(email, password, fullName);
}

export function signIn(email: string, password: string) {
  return authProvider() === "supabase" ? supabaseSignIn(email, password) : localSignIn(email, password);
}

export function signOut() {
  return authProvider() === "supabase" ? supabaseSignOut() : localSignOut();
}
