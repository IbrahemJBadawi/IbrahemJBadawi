import type { Metadata } from "next";
import { NotificationsPage } from "@/components/notifications/NotificationsPage";

export const metadata: Metadata = { title: "الإشعارات", robots: { index: false } };
export const instant = false;

export default function Page() {
  return <NotificationsPage next="/account/notifications" />;
}
