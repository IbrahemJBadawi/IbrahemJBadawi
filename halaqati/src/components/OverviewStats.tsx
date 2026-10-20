import { Stat } from "@/components/ui";
import { ATTENDANCE, ERROR_TYPE } from "@/lib/labels";
import { percent } from "@/lib/format";
import type { StudentOverview } from "@/lib/types";

export function OverviewStats({ o }: { o: StudentOverview }) {
  const att = o.attendance;
  const attTotal = Object.values(att).reduce((a, b) => a + b, 0);
  const attended = (att.present ?? 0) + (att.late ?? 0);
  const adh = o.plan_adherence;
  const planned = (adh.met ?? 0) + (adh.partial ?? 0) + (adh.missed ?? 0);
  const topErrors = Object.entries(o.errors_by_type).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="مقدار الحفظ المعتمد" value={`${o.amount.new_memorization_ayat} آية`} hint="إجمالي" />
        <Stat label="إتقان الحفظ" value={o.mastery_avg ? `${o.mastery_avg}/5` : "—"} hint={`آخر ${o.period_days} يومًا`} />
        <Stat label="جودة التلاوة" value={o.recitation_avg ? `${o.recitation_avg}/5` : "—"} hint={`آخر ${o.period_days} يومًا`} />
        <Stat label="الالتزام بالخطة" value={planned ? `${percent(adh.met ?? 0, planned)}%` : "—"} hint={planned ? `${adh.met ?? 0} من ${planned} واجبات` : "لا توجد واجبات"} />
        <Stat label="الحضور" value={attTotal ? `${percent(attended, attTotal)}%` : "—"} hint={attTotal ? `${attended} من ${attTotal} جلسة` : "لا توجد جلسات"} />
      </div>
      <p className="text-sm text-muted">
        المراجعة خلال الفترة: {o.amount.review_ayat_period} آية · الغياب: {att.absent ?? 0} ({ATTENDANCE.excused}: {att.excused ?? 0})
        {topErrors.length > 0 && <> · أكثر الأخطاء: {topErrors.map(([k, n]) => `${ERROR_TYPE[k]} (${n})`).join("، ")}</>}
      </p>
    </div>
  );
}
