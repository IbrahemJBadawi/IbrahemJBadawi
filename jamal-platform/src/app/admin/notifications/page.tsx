import { NotificationsPage } from "@/components/notifications/NotificationsPage";

export const metadata = { title: "الإشعارات" };

export default function Page() {
  return <NotificationsPage next="/admin/notifications" />;
}
