import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/forms/AuthForms";
import { Skeleton } from "@/components/ui/States";

export const metadata: Metadata = { title: "تسجيل الدخول", robots: { index: false } };

async function Content({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const sp = await searchParams;
  const raw = typeof sp.next === "string" ? sp.next : "/account";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/account";
  if (await getCurrentUser()) redirect(next);
  return <LoginForm next={next} />;
}

export default function Page({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">تسجيل الدخول</h1>
      <p className="mb-8 text-sm text-muted">ادخل لمتابعة طلباتك ومفضلتك.</p>
      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}
