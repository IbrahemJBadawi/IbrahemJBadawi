import type { Metadata } from "next";
import { RegisterForm } from "./RegisterForm";
import { GoogleButton } from "../GoogleButton";

export const metadata: Metadata = { title: "إنشاء حساب" };

export default async function RegisterPage() {
  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-brand-900">إنشاء حساب</h1>
      <p className="mb-5 text-muted">حساب واحد يكفيك لكل أدوارك: طالبًا أو وليّ أمر أو محفّظًا.</p>
      <GoogleButton label="التسجيل بحساب Google" />
      <RegisterForm />
      <p className="mt-3 text-sm text-muted">عند التسجيل بحساب Google يُنشأ حسابك كطالب، ويمكنك إضافة أدوار أخرى من صفحة «حسابي».</p>
    </>
  );
}
