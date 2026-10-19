import type { Metadata } from "next";
import { RegisterForm } from "../forms";

export const metadata: Metadata = { title: "إنشاء حساب" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="mb-1 text-2xl font-extrabold">ابدأ مجانًا</h1>
      <p className="mb-5 text-muted">أنشئ حسابك ثم مساحة شركتك خلال دقيقة.</p>
      <RegisterForm />
    </>
  );
}
