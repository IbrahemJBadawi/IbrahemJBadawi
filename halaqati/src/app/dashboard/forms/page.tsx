import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { FormsWorkspace } from "./FormsWorkspace";

export const metadata: Metadata = { title: "نماذج المراكز والدور" };

export default async function FormsPage() {
  const user = await requireUser();
  const allowed = ["quran_teacher", "center_admin", "org_admin", "platform_admin"];
  if (!user.contexts.some((context) => allowed.includes(context))) redirect("/dashboard");

  return (
    <div className="forms-page">
      <div className="forms-tools">
        <PageHeader title="نماذج المراكز والدور" description="سجلات مستوحاة من نماذج العمل الفعلية: التسجيل، المتابعة، اللجان، التقارير، الموظفون والاجتماعات. املأها واطبعها." />
        <p className="forms-notice" role="note">
          يمكن حفظ نسخة مشفرة من كل نموذج على هذا الجهاز فقط. لا تتزامن السجلات بين أجهزة المركز؛ استخدم أجهزة موثوقة واحتفظ بنسخ احتياطية.
        </p>
      </div>
      <FormsWorkspace />
    </div>
  );
}
