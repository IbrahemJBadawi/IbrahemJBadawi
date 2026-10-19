"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { BellRing, MessageCircle, Package, Receipt, RotateCcw, ShieldCheck, Wallet, XCircle } from "lucide-react";
import { markNotificationRead } from "@/lib/actions/notifications";
import type { NotificationRow } from "@/lib/data/notifications";

const ICONS: Record<string, typeof Package> = {
  order_update: Package,
  ticket_reply: MessageCircle,
  invoice: Receipt,
  admin_new_order: ShieldCheck,
  admin_payment_proof: Wallet,
  admin_cancel_request: XCircle,
  admin_return: RotateCcw,
  admin_ticket: MessageCircle,
};

const rtf = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });
export function timeAgo(iso: string, now = Date.now()) {
  const s = Math.round((new Date(iso).getTime() - now) / 1000);
  const a = Math.abs(s);
  if (a < 60) return "الآن";
  if (a < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (a < 86400) return rtf.format(Math.round(s / 3600), "hour");
  if (a < 7 * 86400) return rtf.format(Math.round(s / 86400), "day");
  return new Intl.DateTimeFormat("ar-u-nu-latn", { day: "numeric", month: "long" }).format(new Date(iso));
}

function dayGroup(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (d.getTime() >= start) return "اليوم";
  if (d.getTime() >= start - 86400_000) return "أمس";
  return "أقدم";
}

/** One notification row (shared by the bell menu and the full page). */
export function NotificationItem({ n, onRead, compact = false }: { n: NotificationRow; onRead: (id: string) => void; compact?: boolean }) {
  const Icon = ICONS[n.kind] ?? BellRing;
  const inner = (
    <span className="flex gap-3">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${n.is_read ? "bg-sand text-ink-soft" : "bg-ink text-ivory"}`}>
        <Icon className="size-[1.1rem]" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className={`text-sm leading-6 ${n.is_read ? "text-ink-soft" : "font-bold text-ink"}`}>{n.title_ar}</span>
          <span className="shrink-0 pt-0.5 text-[0.68rem] text-muted">{timeAgo(n.created_at)}</span>
        </span>
        {n.body_ar && <span className={`mt-0.5 block text-xs leading-6 text-muted ${compact ? "line-clamp-2" : ""}`}>{n.body_ar}</span>}
      </span>
      {!n.is_read && <span className="mt-2 size-2 shrink-0 rounded-full bg-danger" aria-label="جديد" />}
    </span>
  );
  const cls = `block w-full rounded-2xl p-3 text-start transition-colors hover:bg-sand/70 ${n.is_read ? "" : "bg-sand/40"}`;
  const open = () => !n.is_read && onRead(n.id);
  return n.link ? (
    <Link href={n.link} onClick={open} className={cls}>{inner}</Link>
  ) : (
    <button type="button" onClick={open} className={cls}>{inner}</button>
  );
}

export function NotificationList({ items }: { items: NotificationRow[] }) {
  const [, start] = useTransition();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const rows = items.map((n) => (readIds.has(n.id) ? { ...n, is_read: true } : n));
  const shown = filter === "unread" ? rows.filter((n) => !n.is_read) : rows;
  const onRead = (id: string) => {
    setReadIds((s) => new Set(s).add(id));
    start(() => markNotificationRead(id));
  };

  if (!items.length) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-line p-10 text-center">
        <BellRing className="mx-auto size-8 text-beige-deep" strokeWidth={1.4} />
        <p className="mt-3 font-semibold">كل شيء هادئ هنا</p>
        <p className="mt-1 text-sm text-muted">ستجد هنا تحديثات طلباتك وردود فريقنا أولًا بأول.</p>
      </div>
    );
  }
  const groups = ["اليوم", "أمس", "أقدم"].map((g) => [g, shown.filter((n) => dayGroup(n.created_at) === g)] as const).filter(([, l]) => l.length);
  const unread = rows.filter((n) => !n.is_read).length;
  return (
    <div>
      <div className="mb-3 flex gap-2" role="tablist">
        {(["all", "unread"] as const).map((f) => (
          <button key={f} type="button" role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={`rounded-full px-4 py-1.5 text-sm ${filter === f ? "bg-ink font-semibold text-ivory" : "border border-line text-ink-soft"}`}>
            {f === "all" ? "الكل" : `الجديدة${unread ? ` (${unread})` : ""}`}
          </button>
        ))}
      </div>
      {!shown.length ? (
        <p className="rounded-2xl bg-paper p-6 text-center text-sm text-muted">قرأت كل الإشعارات 👌</p>
      ) : (
        <div className="space-y-5">
          {groups.map(([g, list]) => (
            <section key={g}>
              <h3 className="mb-1 px-1 text-xs font-semibold text-muted">{g}</h3>
              <ul className="space-y-1 rounded-[var(--radius-card)] border border-line bg-paper p-1.5">
                {list.map((n) => <li key={n.id}><NotificationItem n={n} onRead={onRead} /></li>)}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
