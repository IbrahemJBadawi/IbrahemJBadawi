import { Settings } from "lucide-react";
import type { Metadata } from "next";
import { ProfileView } from "@/components/profile/ProfileView";
import { PageHeader } from "@/components/ui/States";

export const metadata: Metadata = { title: "الملف الشخصي والإعدادات", robots: { index: false } };

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="الملف الشخصي والإعدادات" icon={<Settings className="h-6 w-6" aria-hidden="true" />} />
      <ProfileView />
    </>
  );
}
