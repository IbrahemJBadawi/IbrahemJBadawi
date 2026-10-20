import { BarChart, weekLabel } from "@/components/motivation/BarChart";
import { Card, Stat } from "@/components/ui";

export type WeekStat = { week: string; points: number; new_ayat: number; review_ayat: number; mastery: number | null };

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Weekly charts for one student — one measure per chart (no dual axes). */
export function StudentStatsView({ weeks }: { weeks: WeekStat[] }) {
  const ms = weeks.filter((w) => w.mastery !== null).map((w) => Number(w.mastery));
  const series = (pick: (w: WeekStat) => number, unit: string) =>
    weeks.map((w) => ({ key: w.week, label: weekLabel(w.week), value: pick(w), tip: `أسبوع ${weekLabel(w.week)}: ${pick(w)} ${unit}` }));
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`النقاط (${weeks.length} أسبوعًا)`} value={sum(weeks.map((w) => w.points))} />
        <Stat label="حفظ جديد معتمد" value={`${sum(weeks.map((w) => w.new_ayat))} آية`} />
        <Stat label="مراجعة" value={`${sum(weeks.map((w) => w.review_ayat))} آية`} />
        <Stat label="متوسط الإتقان" value={ms.length ? `${(sum(ms) / ms.length).toFixed(1)} من 5` : "—"} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><BarChart title="النقاط أسبوعيًا" unit="نقطة" data={series((w) => w.points, "نقطة")} /></Card>
        <Card><BarChart title="الحفظ الجديد أسبوعيًا (آية)" unit="آية" data={series((w) => w.new_ayat, "آية")} /></Card>
        <Card><BarChart title="المراجعة أسبوعيًا (آية)" unit="آية" data={series((w) => w.review_ayat, "آية")} /></Card>
        <Card><BarChart title="متوسط الإتقان أسبوعيًا (من 5)" unit="من 5" data={series((w) => Number(w.mastery ?? 0), "من 5")} /></Card>
      </div>
    </div>
  );
}
