import { cx } from "@/components/ui";
import type { MemberSummary } from "@/lib/data/summary";

/** Level, program, points, streak, quality and league rank — the same for every member. */
export function SummaryChips({ s, tone = "card", showProgram = true }: { s: MemberSummary; tone?: "hero" | "card"; showProgram?: boolean }) {
  const items = [
    { tint: "t-mint", icon: s.level.current.icon, label: "المستوى", value: `${s.level.current.title} (${s.level.index})` },
    ...(showProgram ? [{ tint: "t-sky", icon: "🕌", label: "البرنامج", value: s.program ?? "لم ينضم لحلقة" }] : []),
    { tint: "t-sand", icon: "⭐", label: "النقاط", value: String(s.pointsTotal), sub: `+${s.pointsWeek} هذا الأسبوع` },
    { tint: "t-peach", icon: "🔥", label: "الحماسة", value: `${s.streak} ${s.streak === 1 ? "يوم" : "أيام"}` },
    { tint: "t-lilac", icon: "✨", label: "الجودة", value: s.quality !== null ? `${s.quality} من 5` : "—" },
    { tint: "t-rose", icon: "🏆", label: "الدوري", value: s.rank ? `المركز ${s.rank.rank} من ${s.rank.of}` : "—" },
  ];
  return (
    <dl className={cx("grid gap-2", showProgram ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-5")}>
      {items.map((i) => (
        <div
          key={i.label}
          className={cx(
            "flex min-w-0 items-center gap-2.5 rounded-[14px] px-3 py-2",
            tone === "hero" ? "bg-panel/80 shadow-[var(--shadow-1)] backdrop-blur-sm" : "bg-panel shadow-[var(--shadow-1)] border border-line",
          )}
        >
          <span className={cx("tile-icon", i.tint)} aria-hidden>{i.icon}</span>
          <span className="min-w-0">
            <dt className="text-[0.72rem] text-muted">{i.label}</dt>
            <dd className="line-clamp-2 text-sm font-semibold leading-snug text-ink">{i.value}</dd>
            {"sub" in i && i.sub ? <dd className="text-[0.7rem] text-muted">{i.sub}</dd> : null}
          </span>
        </div>
      ))}
    </dl>
  );
}
