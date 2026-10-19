import type { Metadata } from "next";

export const metadata: Metadata = { title: "شروط الاستخدام" };

export default function Terms() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 leading-8">
      <h1 className="text-3xl font-extrabold">شروط الاستخدام</h1>
      <p className="mt-2 text-sm text-muted">مسودة أولية لمراجعتها قانونيًا قبل الإطلاق التجاري.</p>
      <ul className="mt-6 list-disc ps-6">
        <li>تلتزم الشركة المشتركة بجمع بيانات العملاء بموافقتهم وبما يتوافق مع الأنظمة المحلية.</li>
        <li>يُمنع استخدام المنصة لإرسال رسائل مزعجة أو جمع بيانات دون إذن أصحابها.</li>
        <li>الخطط والحدود والأسعار المعروضة مبدئية، ويُبلَّغ المشتركون بأي تغيير قبل تطبيقه.</li>
        <li>الدفع حاليًا يدوي، ويُفعَّل الاشتراك بعد التحقق من الدفعة.</li>
        <li>للشركة تصدير بياناتها وحذف مساحتها في أي وقت.</li>
      </ul>
    </article>
  );
}
