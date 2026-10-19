import type { Metadata } from "next";
import { ForgotForm } from "../forms";

export const metadata: Metadata = { title: "استعادة كلمة المرور" };

export default function ForgotPage() {
  return (
    <>
      <h1 className="mb-1 text-2xl font-extrabold">استعادة كلمة المرور</h1>
      <p className="mb-5 text-muted">أدخل بريدك وسنرسل لك رابطًا لتعيين كلمة مرور جديدة.</p>
      <ForgotForm />
    </>
  );
}
