"use client";

import Link from "next/link";
import { useTransition } from "react";
import { markNotificationRead } from "@/lib/actions/notifications";
import type { NotificationRow } from "@/lib/data/notifications";

const fmt = (s: string) => new Intl.DateTimeFormat("ar-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(new Date(s));

export function NotificationList({ items }: { items: NotificationRow[] }) {
  const [, start] = useTransition();
  if (!items.length) return <p className="rounded-[var(--radius-card)] border border-dashed border-line p-8 text-center text-sm text-muted">لا توجد إشعارات بعد.</p>;
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper">
      {items.map((n) => {
        const body = (
          <>
            <span className="flex items-start justify-between gap-3">
              <span className={`text-sm ${n.is_read ? "text-ink-soft" : "font-bold text-ink"}`}>{n.title_ar}</span>
              {!n.is_read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-danger" aria-label="غير مقروء" />}
            </span>
            {n.body_ar && <span className="mt-1 block text-xs leading-6 text-muted">{n.body_ar}</span>}
            <span className="mt-1 block text-[0.7rem] text-muted">{fmt(n.created_at)}</span>
          </>
        );
        const onOpen = () => !n.is_read && start(() => markNotificationRead(n.id));
        return (
          <li key={n.id} className={n.is_read ? "" : "bg-sand/40"}>
            {n.link ? (
              <Link href={n.link} onClick={onOpen} className="block p-4 hover:bg-sand/60">{body}</Link>
            ) : (
              <button type="button" onClick={onOpen} className="block w-full p-4 text-start hover:bg-sand/60">{body}</button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
