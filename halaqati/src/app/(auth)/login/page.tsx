import type { Metadata } from "next";
import { Alert } from "@/components/ui";
import { LoginForm } from "./LoginForm";
import { GoogleButton } from "../GoogleButton";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-brand-900">تسجيل الدخول</h1>
      <p className="mb-5 text-muted">أهلًا بك من جديد في حلقتي.</p>
      {(sp.error === "google" || sp.error === "rate") && (
        <div className="mb-4">
          <Alert tone="error">{sp.error === "rate" ? "محاولات كثيرة، انتظر قليلًا." : "تعذّر الدخول بحساب Google. حاول مرة أخرى."}</Alert>
        </div>
      )}
      {sp.error === "link" && (
        <div className="mb-4">
          <Alert tone="error">الرابط غير صالح أو انتهت صلاحيته.</Alert>
        </div>
      )}
      <GoogleButton next={next} label="الدخول بحساب Google" />
      <LoginForm next={next} />
    </>
  );
}
