import { cx } from "@/components/ui";
import type { MemberSummary } from "@/lib/data/summary";

/** Level, program, points, streak, quality and league rank — the same for every member. */
export function SummaryChips({ s, tone = "card", showProgram = true }: { s: MemberSummary; tone?: "hero" | "card"; showProgram?: boolean }) {
  const items = [
    { icon: s.level.current.icon, label: "المستوى", value: `${s.level.current.title} (${s.level.index})` },
    ...(showProgram ? [{ icon: "📖", label: "البرنامج", value: s.program ?? "لم ينضم لحلقة" }] : []),
    { icon: "⭐", label: "النقاط", value: `${s.pointsTotal} · هذا الأسبوع ${s.pointsWeek}` },
    { icon: "🔥", label: "الحماسة", value: `${s.streak} ${s.streak === 1 ? "يوم" : "أيام"}` },
    { icon: "✨", label: "الجودة", value: s.quality !== null ? `${s.quality} من 5` : "—" },
    { icon: "🏆", label: "الدوري", value: s.rank ? `المركز ${s.rank.rank} من ${s.rank.of}` : "—" },
  ];
  return (
    <dl className="flex flex-wrap gap-2">
      {items.map((i) => (
        <div key={i.label} className={cx("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm", tone === "hero" ? "bg-white/15 text-white" : "bg-deep text-ink")}>
          <span aria-hidden>{i.icon}</span>
          <dt className={tone === "hero" ? "text-white/75" : "text-muted"}>{i.label}:</dt>
          <dd className="font-semibold">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}
