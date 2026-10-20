import { getCurrentUser } from "@/lib/auth";
import { listNotifications, unreadCount } from "@/lib/data/notifications";
import { BellMenu } from "./BellMenu";

/** Bell with unread count and a drop-down; renders nothing for visitors who are not signed in. */
export async function NotificationBell({ href = "/account/notifications" }: { href?: string; className?: string }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const [n, items] = await Promise.all([unreadCount(user), listNotifications(user, 8)]);
  return <BellMenu items={items} unread={n} href={href} />;
}
