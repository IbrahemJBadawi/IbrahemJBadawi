import Link from "next/link";
import { levelFor } from "@/lib/levels";

export function LevelCard({ points, compact = false }: { points: number; compact?: boolean }) {
  const l = levelFor(points);
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-12 shrink-0 place-items-center rounded-[16px] bg-brand-100 text-2xl" aria-hidden>{l.current.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted">المستوى {l.index}</p>
        <p className="font-bold">{l.current.title}</p>
        <div className="progress-track mt-1" role="progressbar" aria-valuenow={l.progress} aria-valuemin={0} aria-valuemax={100} aria-label="التقدّم إلى المستوى التالي">
          <div className="progress-fill" style={{ width: `${l.progress}%` }} />
        </div>
        <p className="mt-1 text-xs text-muted">
          {l.next ? <>بقي {l.toNext} نقطة إلى «{l.next.title}» {l.next.icon}</> : "أعلى مستوى، ما شاء الله"}
          {!compact && <> · <Link href="/dashboard/guide" className="font-semibold text-brand-800">كيف أرتقي؟</Link></>}
        </p>
      </div>
    </div>
  );
}
