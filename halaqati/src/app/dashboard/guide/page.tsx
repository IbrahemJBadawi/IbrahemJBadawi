import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui";
import { BADGES, LEVELS } from "@/lib/levels";

export const metadata: Metadata = { title: "دليل النقاط والمستويات" };

/** Every number here is the rule the platform applies (database triggers and src/lib/levels.ts). */
const POINTS = [
  { what: "حفظ جديد معتمد", pts: "10 (+5 إن اكتمل، +2 إن كان جزئيًا)" },
  { what: "مراجعة قريبة أو بعيدة معتمدة", pts: "6 (+5 / +2)" },
  { what: "حضور جلسة", pts: "5 (المتأخر 3)" },
  { what: "الورد اليومي", pts: "3 مرة واحدة في اليوم" },
  { what: "مهمة شخصية منجزة", pts: "2 (حتى 10 نقاط يوميًا)" },
];

export default function GuidePage() {
  return (
    <>
      <PageHeader title="دليل النقاط والمستويات" description="كيف تُكسب النقاط والحماسة والأوسمة في حلقتي. النية لله، وهذه وسائل تشجيع." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-bold text-brand-800">النقاط</h2>
          <table className="w-full text-start">
            <tbody>
              {POINTS.map((p) => <tr key={p.what} className="border-t border-line first:border-0"><td className="py-2">{p.what}</td><td className="py-2 font-semibold">{p.pts}</td></tr>)}
            </tbody>
          </table>
          <p className="mt-2 text-sm text-muted">تُحسب النقاط في قاعدة البيانات تلقائيًا من السجلات المعتمدة فقط، ولا يستطيع أحد تعديلها يدويًا.</p>
        </Card>
        <Card>
          <h2 className="mb-2 font-bold text-brand-800">الحماسة 🔥</h2>
          <p>عدد الأيام المتتالية التي كسبت فيها نقطة واحدة على الأقل: ورد، أو تسميع، أو حضور، أو مهمة. إن لم تنشط اليوم بعدُ تبقى سلسلتك قائمة حتى نهاية اليوم.</p>
          <h2 className="mb-2 mt-4 font-bold text-brand-800">الدوري 🏆</h2>
          <p>ترتيب أسبوعي وشهري داخل حلقتك فقط بنقاط الحلقة. يمكنك إخفاء اسمك، ويستطيع المحفّظ إيقاف الدوري.</p>
        </Card>
        <Card>
          <h2 className="mb-2 font-bold text-brand-800">المستويات</h2>
          <ol className="flex flex-col gap-1.5">
            {LEVELS.map((l, i) => <li key={l.title} className="flex items-center gap-3"><span className="w-8 text-center text-xl" aria-hidden>{l.icon}</span><span className="flex-1">المستوى {i + 1}: <strong>{l.title}</strong></span><span className="tabular-nums text-muted">{l.min}+ نقطة</span></li>)}
          </ol>
        </Card>
        <Card>
          <h2 className="mb-2 font-bold text-brand-800">الأوسمة</h2>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {BADGES.map((b) => <li key={b.key} className="flex items-center gap-2"><span aria-hidden>{b.icon}</span><span><strong>{b.title}</strong> — <span className="text-muted">{b.hint}</span></span></li>)}
          </ul>
        </Card>
      </div>
    </>
  );
}
