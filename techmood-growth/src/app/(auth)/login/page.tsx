import type { Metadata } from "next";
import { LoginForm } from "../forms";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  return (
    <>
      <h1 className="mb-1 text-2xl font-extrabold">أهلًا بعودتك 👋</h1>
      <p className="mb-5 text-muted">سجّل الدخول لمتابعة عملائك ومواعيدك.</p>
      <LoginForm next={typeof sp.next === "string" ? sp.next : undefined} />
    </>
  );
}
