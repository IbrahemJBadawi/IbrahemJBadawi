"use client";

import { Heart, History, Leaf } from "lucide-react";
import { useMemo, useState } from "react";
import type { OasisMoment } from "@/content/types";
import { Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Form";
import { EmptyState } from "@/components/ui/States";
import { dayKey, formatHijri, formatShortDate, parseDayKey } from "@/lib/date";
import { formatCitation, getSurahMeta } from "@/lib/quran";
import { pickMomentForDay } from "@/lib/oasis";
import { useHydrated, useStore } from "@/lib/store/store";
import { OasisMomentCard } from "./OasisMomentCard";

function MomentRow({ m, sub, onOpen }: { m: OasisMoment; sub?: string; onOpen: () => void }) {
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-right hover:bg-surface-2 focus-ring">
        <span>
          <span className="block font-bold">
            سورة {getSurahMeta(m.surah)?.name} {formatCitation(m.surah, m.ayahFrom, m.ayahTo)}
          </span>
          {m.reflection && <span className="line-clamp-1 block text-sm text-muted">{m.reflection}</span>}
        </span>
        {sub && <span className="shrink-0 text-xs text-muted">{sub}</span>}
      </button>
    </li>
  );
}

export function OasisView({ moments }: { moments: OasisMoment[] }) {
  const hydrated = useHydrated();
  const today = dayKey();
  const [tab, setTab] = useState<"today" | "history" | "favorites">("today");
  const [opened, setOpened] = useState<{ m: OasisMoment; day: string; journal: boolean } | null>(null);
  const seen = useStore((s) => s.oasisSeen);
  const favs = useStore((s) => s.oasisFavorites);
  const journal = useStore((s) => s.journal);
  const byId = useMemo(() => new Map(moments.map((m) => [m.id, m])), [moments]);
  const moment = useMemo(() => (hydrated ? pickMomentForDay(moments, today) : null), [hydrated, moments, today]);
  const hijri = hydrated ? formatHijri() : null;

  const history = useMemo(
    () =>
      Object.entries(seen)
        .filter(([d]) => d < today)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([d, id]) => ({ day: d, m: byId.get(id) }))
        .filter((x): x is { day: string; m: OasisMoment } => !!x.m),
    [seen, today, byId],
  );
  const favorites = useMemo(
    () => moments.filter((m) => favs[m.id] && !favs[m.id].deleted),
    [moments, favs],
  );

  if (opened) {
    return (
      <div className="mx-auto max-w-2xl">
        <button type="button" onClick={() => setOpened(null)} className="mb-4 rounded-full px-3 py-2 text-sm font-semibold text-muted hover:bg-surface-2 focus-ring">
          ← العودة
        </button>
        {opened.journal && <p className="mb-3 text-sm text-muted">لحظة {formatShortDate(opened.day)}</p>}
        <OasisMomentCard moment={opened.m} day={opened.day} markSeen={false} journal={opened.journal} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="عرض"
          value={tab}
          onChange={setTab}
          options={[
            { value: "today", label: "اليوم" },
            { value: "history", label: "السجل" },
            { value: "favorites", label: "المفضلة" },
          ]}
        />
        <p className="min-h-6 text-sm text-muted">
          {hydrated && new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long" }).format(parseDayKey(today))}
          {hijri && ` · ${hijri}`}
        </p>
      </div>

      {tab === "today" &&
        (!hydrated ? (
          <div className="h-64 animate-pulse rounded-[var(--radius-card)] bg-surface-2" />
        ) : moment ? (
          <OasisMomentCard moment={moment} day={today} />
        ) : (
          <EmptyState icon={<Leaf className="h-6 w-6" />} title="لا توجد لحظة منشورة لهذا اليوم">
            نحرص على ألا ننشر إلا محتوى موثقًا ومراجعًا. يمكنك في هذه الأثناء قراءة وردك من المصحف.
          </EmptyState>
        ))}

      {tab === "history" && (
        <Card>
          {!hydrated ? null : history.length ? (
            <ul className="-mx-2 divide-y divide-line">
              {history.map(({ day, m }) => (
                <MomentRow
                  key={day}
                  m={m}
                  sub={`${formatShortDate(day)}${journal[`${day}:${m.id}`] && !journal[`${day}:${m.id}`].deleted ? " · ✎" : ""}`}
                  onOpen={() => setOpened({ m, day, journal: true })}
                />
              ))}
            </ul>
          ) : (
            <EmptyState icon={<History className="h-6 w-6" />} title="سجلك فارغ حتى الآن">
              ستظهر هنا لحظات الأيام السابقة التي اطّلعت عليها، مع خواطرك.
            </EmptyState>
          )}
        </Card>
      )}

      {tab === "favorites" && (
        <Card>
          {!hydrated ? null : favorites.length ? (
            <ul className="-mx-2 divide-y divide-line">
              {favorites.map((m) => (
                <MomentRow key={m.id} m={m} onOpen={() => setOpened({ m, day: today, journal: false })} />
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Heart className="h-6 w-6" />} title="لا توجد لحظات محفوظة">
              احفظ اللحظات التي تحب الرجوع إليها.
            </EmptyState>
          )}
        </Card>
      )}
    </div>
  );
}
