import type { Metadata } from "next";
import { ForgotForm } from "./ForgotForm";

export const metadata: Metadata = { title: "استعادة كلمة المرور" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-brand-900">استعادة كلمة المرور</h1>
      <p className="mb-5 text-muted">أدخل بريدك وسنرسل لك رابطًا لتعيين كلمة مرور جديدة.</p>
      <ForgotForm />
    </>
  );
}
