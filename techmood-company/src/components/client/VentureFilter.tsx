"use client";

import { useState, type ReactNode } from "react";
import type { VentureStatus } from "@/data/ventures";
import { useLocale, useT } from "@/i18n/client";
import { statusLabel } from "@/lib/status";
import { STORAGE_KEYS, useStored } from "@/lib/storage";

type Filter = "all" | "following" | VentureStatus;

/** Status chips over the ventures grid; "Following" reads this device's list. */
export function VentureFilter({ items, cards }: { items: { slug: string; status: VentureStatus }[]; cards: ReactNode[] }) {
  const t = useT();
  const locale = useLocale();
  const [filter, setFilter] = useState<Filter>("all");
  const [following] = useStored<Record<string, string>>(STORAGE_KEYS.following, {});

  const matches = (item: { slug: string; status: VentureStatus }) =>
    filter === "all" || (filter === "following" ? Boolean(following[item.slug]) : item.status === filter);

  const statuses = (["live", "beta", "in-development", "planned"] as VentureStatus[]).filter((status) => items.some((item) => item.status === status));
  const options: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: t("الكل", "All"), count: items.length },
    ...statuses.map((status) => ({ value: status as Filter, label: statusLabel(status, locale), count: items.filter((item) => item.status === status).length })),
    { value: "following", label: t("أتابعها", "Following"), count: items.filter((item) => following[item.slug]).length },
  ];
  const visible = items.filter(matches).length;

  return (
    <>
      <div className="ticker" role="group" aria-label={t("تصفية حسب الحالة", "Filter by status")} style={{ marginBottom: 20 }}>
        {options.map((option) => (
          <button key={option.value} type="button" className="chip" aria-pressed={filter === option.value} onClick={() => setFilter(option.value)}>
            {option.label} <span className="count">{option.count}</span>
          </button>
        ))}
      </div>
      <p className="sr-only" role="status">
        {t(`${visible} مشاريع معروضة`, `${visible} ventures shown`)}
      </p>
      <div className="grid grid-3">
        {items.map((item, index) => (matches(item) ? <div key={item.slug} style={{ display: "contents" }}>{cards[index]}</div> : null))}
      </div>
      {visible === 0 && (
        <div className="state" style={{ padding: "32px 16px" }}>
          <p>
            {filter === "following"
              ? t("لا تتابع أي مشروع بعد. اضغط «تابع» على أي مشروع لتجده هنا وتصلك تحديثات حالته.", "You aren't following any venture yet. Tap “Follow” on one to find it here and get its status updates.")
              : t("لا توجد مشاريع بهذه الحالة.", "No ventures with this status.")}
          </p>
        </div>
      )}
    </>
  );
}
