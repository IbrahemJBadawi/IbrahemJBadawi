"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { markAllReadQuick, markNotificationRead } from "@/lib/actions/notifications";
import type { NotificationRow } from "@/lib/data/notifications";
import { NotificationItem } from "./NotificationList";

/** Bell with a drop-down of the latest notifications. */
export function BellMenu({ items, unread, href }: { items: NotificationRow[]; unread: number; href: string }) {
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<Set<string> | "all">(new Set());
  const [, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  const rows = items.map((n) => (read === "all" || read.has(n.id) ? { ...n, is_read: true } : n));
  const count = read === "all" ? 0 : Math.max(0, unread - items.filter((n) => !n.is_read && read.has(n.id)).length);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="dialog" aria-label={count ? `الإشعارات (${count} جديد)` : "الإشعارات"} className="relative flex size-10 items-center justify-center rounded-full hover:bg-sand">
        <Bell className="size-5" strokeWidth={1.6} />
        {count > 0 && <span className="absolute top-1 end-1 min-w-4 rounded-full bg-danger px-1 text-center text-[0.6rem] font-bold leading-4 text-white ring-2 ring-paper">{count > 99 ? "99+" : count}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label="الإشعارات" className="fixed inset-x-3 top-16 z-50 max-h-[70vh] overflow-hidden rounded-[1.5rem] border border-line bg-paper shadow-[0_24px_48px_-20px_rgba(29,27,24,0.45)] sm:absolute sm:inset-x-auto sm:top-12 sm:end-0 sm:w-96">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-bold">الإشعارات</p>
            {count > 0 && (
              <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-beige-deep hover:text-ink" onClick={() => { setRead("all"); start(() => markAllReadQuick()); }}>
                <CheckCheck className="size-4" /> تعليم الكل كمقروء
              </button>
            )}
          </div>
          <div className="max-h-[calc(70vh-7rem)] overflow-y-auto p-1.5">
            {rows.length ? (
              <ul className="space-y-1">
                {rows.map((n) => (
                  <li key={n.id} onClick={() => setOpen(false)}>
                    <NotificationItem n={n} compact onRead={(id) => { setRead((s) => (s === "all" ? s : new Set(s).add(id))); start(() => markNotificationRead(id)); }} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-8 text-center text-sm text-muted">لا جديد الآن. سنخبرك فور تحديث طلباتك.</p>
            )}
          </div>
          <Link href={href} onClick={() => setOpen(false)} className="block border-t border-line py-3 text-center text-sm font-semibold hover:bg-sand">
            عرض كل الإشعارات والإعدادات
          </Link>
        </div>
      )}
    </div>
  );
}
