import type { Metadata } from "next";
import { BellRing, CalendarCheck2, ClipboardList, Download, KanbanSquare, LineChart, Lock, Moon, Sparkles, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = { title: "المزايا" };

const GROUPS = [
  { icon: ClipboardList, tone: "tone-blue", t: "نماذج الاستقبال", items: ["منشئ حقول بسيط: نص، هاتف، بريد، قوائم، تاريخ", "أسئلة تأهيل مميزة في ملف العميل", "رابط عام لكل نموذج ومعاينة قبل النشر", "تسجيل المصدر والحملة (UTM) تلقائيًا", "حماية من الرسائل العشوائية وتحديد معدل الإرسال", "إشعار خصوصية وموافقة صريحة"] },
  { icon: KanbanSquare, tone: "tone-violet", t: "إدارة العملاء (CRM)", items: ["مراحل قابلة للتسمية وإعادة الترتيب", "لوحة مراحل (Kanban) وقائمة بالبحث والتصفية والترتيب", "ملاحظات ومكالمات وواتساب في سجل زمني", "موعد المتابعة القادم وتنبيه المتأخر", "كشف التكرار دون دمج تلقائي", "سجل تدقيق للتغييرات المهمة"] },
  { icon: CalendarCheck2, tone: "tone-green", t: "المواعيد", items: ["أوقات عمل أسبوعية بمنطقة شركتك الزمنية", "مدة الموعد والفواصل وأقل مهلة للحجز", "منع الحجز المزدوج في قاعدة البيانات", "صفحة للعميل لإلغاء موعده أو تغييره", "تأكيد وتذكير بالبريد عند تهيئة المزود"] },
  { icon: LineChart, tone: "tone-sky", t: "التقارير", items: ["العملاء حسب المصدر والمرحلة", "المواعيد المحجوزة والمنعقدة والملغاة", "معدل التحويل وأداء النماذج والحملات", "مقارنة بالفترة السابقة"] },
  { icon: Sparkles, tone: "tone-pink", t: "المساعد الذكي", items: ["مسودات رسائل متابعة", "تلخيص ملف العميل وملاحظاته", "اقتراح أسئلة تأهيل ونصوص صفحات الاستقبال", "لا يرسل شيئًا تلقائيًا ولا يشارك أسماء أو أرقام"] },
  { icon: Users, tone: "tone-amber", t: "الفريق والصلاحيات", items: ["مالك، مدير، موظف مبيعات، مشاهدة فقط", "دعوات بالبريد بروابط لمرة واحدة", "أكثر من شركة لنفس الحساب"] },
  { icon: BellRing, tone: "tone-blue", t: "إشعارات الجهاز", items: ["تنبيه فوري عند طلب أو حجز جديد", "يعمل والتطبيق مغلق (Web Push)", "تفعيل وإيقاف لكل جهاز"] },
  { icon: Download, tone: "tone-green", t: "تطبيق قابل للتثبيت", items: ["أيقونة على الشاشة الرئيسية", "يفتح مباشرة على لوحتك", "صفحة دون اتصال لا تحفظ بيانات العملاء"] },
  { icon: Lock, tone: "tone-violet", t: "الخصوصية والأمان", items: ["عزل كامل بين الشركات (Row Level Security)", "تصدير بيانات شركتك وحذفها", "مدة احتفاظ قابلة للضبط للطلبات الخام"] },
  { icon: Moon, tone: "tone-gray", t: "مريح للعين", items: ["وضع داكن يُحفظ على جهازك", "عربي بالكامل من اليمين لليسار", "مصمم للهاتف أولًا"] },
];

export default function Features() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <h1 className="text-center text-4xl font-extrabold">كل ما تحتاجه لتنمية عملائك</h1>
      <p className="mx-auto mt-3 max-w-2xl text-center text-muted">مزايا تعمل فعليًا ومتصلة ببياناتك — لا أرقام وهمية ولا تكاملات شكلية.</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GROUPS.map((g) => (
          <section key={g.t} className="surface p-5">
            <div className="flex items-center gap-3">
              <span className={`grid h-11 w-11 place-items-center rounded-2xl ${g.tone}`}><g.icon size={20} aria-hidden /></span>
              <h2 className="text-lg font-bold">{g.t}</h2>
            </div>
            <ul className="mt-3 flex list-disc flex-col gap-1.5 ps-5 text-muted">
              {g.items.map((i) => <li key={i}>{i}</li>)}
            </ul>
          </section>
        ))}
      </div>
      <div className="mt-10 text-center">
        <ButtonLink href="/register">جرّبه الآن مجانًا</ButtonLink>
      </div>
    </div>
  );
}
