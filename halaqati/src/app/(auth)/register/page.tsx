import type { Metadata } from "next";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "إنشاء حساب" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-brand-900">إنشاء حساب</h1>
      <p className="mb-5 text-muted">حساب واحد يكفيك لكل أدوارك: طالبًا أو وليّ أمر أو محفّظًا.</p>
      <RegisterForm />
    </>
  );
}
