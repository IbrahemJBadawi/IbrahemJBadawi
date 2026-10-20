"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

/** Supabase keeps the session in a readable "sb-…-auth-token" cookie; public pages stay static. */
const hasSession = () => /(?:^|;\s*)sb-[^=]+-auth-token(?:\.\d+)?=/.test(document.cookie);

export function AuthLinks() {
  const signedIn = useSyncExternalStore(() => () => {}, hasSession, () => false);
  if (signedIn) {
    return <Link href="/dashboard" className="btn btn-primary !min-h-10">لوحتي</Link>;
  }
  return (
    <>
      <Link href="/login" className="btn btn-ghost !min-h-10 !px-3.5">دخول</Link>
      <Link href="/register" className="btn btn-primary hidden !min-h-10 sm:inline-flex">حساب جديد</Link>
    </>
  );
}
