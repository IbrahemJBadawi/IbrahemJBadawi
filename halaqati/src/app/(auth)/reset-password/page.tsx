import type { Metadata } from "next";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = { title: "تعيين كلمة مرور جديدة" };

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-brand-900">تعيين كلمة مرور جديدة</h1>
      <p className="mb-5 text-muted">اختر كلمة مرور جديدة لحسابك.</p>
      <ResetForm />
    </>
  );
}
