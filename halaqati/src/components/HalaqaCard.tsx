import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { AUDIENCE, LEVEL, MEETING_MODE } from "@/lib/labels";
import { formatSchedule } from "@/lib/format";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import type { PublicHalaqa } from "@/lib/types";

export function HalaqaCard({ h }: { h: PublicHalaqa }) {
  const full = h.active_students >= h.max_students;
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-bold text-brand-900">
          <Link href={`/halaqat/${h.id}`} className="hover:underline">{h.name}</Link>
        </h3>
        {full ? <Badge tone="red">مكتملة</Badge> : <Badge tone="green">متاحة</Badge>}
      </div>
      <p className="text-sm text-muted">
        المحفّظ: <span className="font-semibold text-ink">{h.teacher_name}</span><VerifiedBadge verified={h.teacher_verified} />
        {h.center_name ? <> · {h.center_name}</> : <> · حلقة مستقلة</>}
      </p>
      <div className="flex flex-wrap gap-2">
        <Badge>{MEETING_MODE[h.meeting_mode]}</Badge>
        <Badge>{LEVEL[h.level]}</Badge>
        <Badge>{AUDIENCE[h.audience_gender]}</Badge>
        {(h.age_min || h.age_max) && <Badge>العمر {h.age_min ?? "؟"}–{h.age_max ?? "؟"}</Badge>}
      </div>
      {formatSchedule(h.schedule).length > 0 && (
        <p className="text-sm text-muted">{formatSchedule(h.schedule).join(" · ")}</p>
      )}
      <p className="text-sm text-muted">{h.active_students} / {h.max_students} طالب</p>
    </Card>
  );
}
