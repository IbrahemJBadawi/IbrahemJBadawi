import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { asSystem } from "@/lib/db";
import { OWNER_EMAIL } from "@/lib/db/core";
import { setSession } from "./local";
import { supabaseAnonKey, supabaseServerClient } from "./supabase";

/**
 * "Continue with Google".
 * - With Supabase Auth: Supabase's Google provider (enabled in the Supabase dashboard).
 * - With local auth: a direct Google OpenID Connect flow using
 *   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (Google Cloud → Credentials).
 */
const STATE_COOKIE = "jamal_google";
let supabaseGoogle: { at: number; on: boolean } | null = null;

export async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Whether a Google button should be shown at all. */
export async function googleAvailable(provider: "supabase" | "local") {
  if (provider === "local") return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  if (supabaseGoogle && Date.now() - supabaseGoogle.at < 5 * 60_000) return supabaseGoogle.on;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: supabaseAnonKey() },
      signal: AbortSignal.timeout(4000),
    });
    const data = (await res.json()) as { external?: { google?: boolean } };
    supabaseGoogle = { at: Date.now(), on: !!data.external?.google };
  } catch {
    supabaseGoogle = { at: Date.now(), on: false };
  }
  return supabaseGoogle.on;
}

const b64url = (b: Buffer) => b.toString("base64url");

/** URL to send the visitor to Google. */
export async function googleStartUrl(provider: "supabase" | "local", next: string) {
  const callback = `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`;
  if (provider === "supabase") {
    const supabase = await supabaseServerClient();
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback } });
    if (error || !data.url) throw new Error("google sign-in unavailable");
    return data.url;
  }
  const state = b64url(randomBytes(24));
  const verifier = b64url(randomBytes(32));
  (await cookies()).set(STATE_COOKIE, JSON.stringify({ state, verifier, next }), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600,
  });
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${await siteOrigin()}/auth/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: b64url(createHash("sha256").update(verifier).digest()),
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

/** Finishes the local Google flow; returns where to go next, or null on failure. */
export async function finishLocalGoogle(code: string, state: string): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(STATE_COOKIE)?.value;
  store.delete(STATE_COOKIE);
  if (!raw) return null;
  const saved = JSON.parse(raw) as { state: string; verifier: string; next: string };
  if (saved.state !== state) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${await siteOrigin()}/auth/callback`,
      grant_type: "authorization_code",
      code_verifier: saved.verifier,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const { id_token } = (await res.json()) as { id_token?: string };
  if (!id_token) return null;
  // Received directly from Google's token endpoint over TLS: the claims can be read without re-verifying the signature.
  const claims = JSON.parse(Buffer.from(id_token.split(".")[1], "base64url").toString("utf8")) as {
    iss: string; aud: string; exp: number; email?: string; email_verified?: boolean; name?: string;
  };
  const okIssuer = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  if (!okIssuer || claims.aud !== process.env.GOOGLE_CLIENT_ID || claims.exp * 1000 < Date.now()) return null;
  if (!claims.email || !claims.email_verified) return null;
  const email = claims.email.toLowerCase();
  const user = await asSystem(async (tx) => {
    const [u] = await tx.query<{ id: string; email: string }>(
      `insert into auth.users (email, raw_user_meta_data) values ($1, jsonb_build_object('full_name', $2::text))
       on conflict (email) do update set updated_at = now() returning id, email`,
      [email, claims.name ?? ""],
    );
    // Google verified the address, so the owner can be recognised safely.
    if (email === ownerEmail()) await tx.query("update public.profiles set role = 'admin' where id = $1", [u.id]);
    return u;
  });
  await setSession(user);
  return saved.next;
}

/** The store owner's address (admin). */
export function ownerEmail() {
  return (process.env.ADMIN_EMAIL || OWNER_EMAIL).trim().toLowerCase();
}
