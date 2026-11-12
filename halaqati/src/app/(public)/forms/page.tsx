import type { Metadata } from "next";
import { FormsWorkspace } from "@/app/dashboard/forms/FormsWorkspace";

export const metadata: Metadata = { title: "نماذج المراكز والدور" };

export default function PublicCenterFormsPage() {
  return (
    <section className="forms-page">
      <div className="forms-tools mb-5">
        <span className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-900">مكتبة نماذج حلقتي</span>
        <h1 className="mt-3 text-2xl font-bold text-ink">نماذج المراكز والدور</h1>
        <p className="mt-2 max-w-3xl text-muted">
          قوالب عربية مستوحاة من نماذج العمل الورقية لمراكز تحفيظ القرآن الكريم.
          يمكنك تعبئتها وطباعتها، أو حفظ نسخ مشفرة منها داخل هذا الجهاز مع تصدير نسخة احتياطية.
        </p>
        <p className="forms-notice mt-3" role="note">
          هذه مساحة مستقلة لا تتطلب حسابًا سحابيًا. لا تُرفع المدخلات إلى خادم؛ الحفظ يتم محليًا فقط عند اختيار «حفظ» بكلمة مرور. استخدم جهازًا موثوقًا واحتفظ بنسخة احتياطية مشفرة.
        </p>
      </div>
      <FormsWorkspace />
    </section>
  );
}
