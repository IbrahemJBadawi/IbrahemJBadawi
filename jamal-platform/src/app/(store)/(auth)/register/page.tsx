import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "@/components/forms/AuthForms";
import { Skeleton } from "@/components/ui/States";

export const metadata: Metadata = { title: "إنشاء حساب", robots: { index: false } };

async function Content({ searchParams }: { searchParams: PageProps<"/register">["searchParams"] }) {
  const sp = await searchParams;
  const raw = typeof sp.next === "string" ? sp.next : "/account";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/account";
  if (await getCurrentUser()) redirect(next);
  return <RegisterForm next={next} />;
}

export default function Page({ searchParams }: PageProps<"/register">) {
  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">إنشاء حساب</h1>
      <p className="mb-8 text-sm text-muted">احفظ مفضلتك وتابع طلباتك في مكان واحد.</p>
      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}
