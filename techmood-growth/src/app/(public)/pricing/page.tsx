import type { Metadata } from "next";
import { Check, X } from "lucide-react";
import { Alert, ButtonLink } from "@/components/ui";
import { fmtMoney } from "@/lib/format";
import { getPlans, limitText } from "@/lib/plans";

export const metadata: Metadata = { title: "الأسعار" };

export default async function Pricing() {
  const plans = await getPlans();
  return (
    <div className="public-hero">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <h1 className="text-center text-4xl font-extrabold">خطط بسيطة تنمو معك</h1>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted">
          ابدأ مجانًا، وجرّب خطة Growth كاملة لمدة 14 يومًا. الحدود تُطبَّق من الخادم وتظهر لك بوضوح في لوحة الاستخدام.
        </p>
        {plans.length === 0 ? (
          <div className="mx-auto mt-10 max-w-md">
            <Alert tone="warning">تعذّر تحميل الخطط الآن. حاول لاحقًا.</Alert>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {plans.map((p) => {
              const featured = p.code === "growth";
              const rows: [boolean, string][] = [
                [true, p.max_members === 1 ? "مستخدم واحد" : `حتى ${limitText(p.max_members, "مستخدمين")}`],
                [true, `${limitText(p.max_leads_per_month, "عميل محتمل")} شهريًا`],
                [true, p.max_forms === 1 ? "نموذج استقبال واحد" : `حتى ${limitText(p.max_forms, "نماذج")} نشطة`],
                [p.public_booking, "رابط حجز مواعيد عام"],
                [true, "لوحة مؤشرات وتقارير أساسية"],
                [p.advanced_reports, "تقارير متقدمة: الحملات والنماذج ومقارنة الفترات"],
                [(p.ai_requests_per_month ?? 1) > 0, p.ai_requests_per_month ? `مساعد ذكي (${p.ai_requests_per_month} طلب شهريًا)` : "مساعد ذكي"],
              ];
              return (
                <div key={p.code} className={`surface relative flex flex-col p-6 ${featured ? "ring-2 ring-[color:var(--royal)]" : ""}`}>
                  {featured && <span className="badge tone-blue absolute -top-3 start-6">الأنسب للفرق</span>}
                  <h2 className="text-xl font-extrabold">{p.name}</h2>
                  <p className="text-muted">{p.description}</p>
                  <p className="mt-4 text-4xl font-extrabold num">
                    {p.price_cents === 0 ? "مجانًا" : fmtMoney(p.price_cents, p.currency)}
                    {p.price_cents > 0 && <span className="text-base font-semibold text-muted"> / شهريًا</span>}
                  </p>
                  <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                    {rows.map(([on, text]) => (
                      <li key={text} className={`flex items-start gap-2 ${on ? "" : "text-faint line-through"}`}>
                        {on ? <Check size={18} className="mt-1 shrink-0 text-ok" aria-hidden /> : <X size={18} className="mt-1 shrink-0" aria-hidden />}
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                  <ButtonLink href="/register" variant={featured ? "primary" : "secondary"} className="mt-6">
                    {p.price_cents === 0 ? "ابدأ مجانًا" : "ابدأ بالتجربة المجانية"}
                  </ButtonLink>
                </div>
              );
            })}
          </div>
        )}
        <div className="mx-auto mt-10 max-w-3xl surface p-5 text-sm text-muted">
          <p className="font-bold text-ink">ملاحظات</p>
          <ul className="mt-2 list-disc ps-5">
            <li>الأسعار والحدود مبدئية وقابلة للتعديل قبل الإطلاق التجاري.</li>
            <li>الدفع حاليًا بالتحويل البنكي أو نقدًا، ويُفعَّل الاشتراك بعد التحقق من الدفعة. لا نخزّن بيانات بطاقات.</li>
            <li>عند انتهاء التجربة أو الاشتراك تعود الشركة تلقائيًا إلى الخطة المجانية دون حذف أي بيانات.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
