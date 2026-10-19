import Link from "next/link";
import { Bell } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { unreadCount } from "@/lib/data/notifications";

/** Bell with unread count; renders nothing for visitors who are not signed in. */
export async function NotificationBell({ href = "/account/notifications", className = "" }: { href?: string; className?: string }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const n = await unreadCount(user);
  return (
    <Link href={href} className={`relative ${className}`} aria-label={n ? `الإشعارات (${n} غير مقروء)` : "الإشعارات"}>
      <Bell className="size-5" strokeWidth={1.6} />
      {n > 0 && (
        <span className="absolute -top-0.5 end-0 min-w-4 rounded-full bg-danger px-1 text-center text-[0.6rem] font-bold leading-4 text-white">{n > 99 ? "99+" : n}</span>
      )}
    </Link>
  );
}
