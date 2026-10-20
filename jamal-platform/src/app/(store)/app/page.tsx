import type { Metadata } from "next";
import { InstallApp } from "@/components/pwa/InstallApp";
import { Monogram } from "@/components/ui/Logo";

export const metadata: Metadata = { title: "تطبيق الهاتف", alternates: { canonical: "/app" } };

export default function AppPage() {
  return (
    <div className="container-page max-w-xl py-14 text-center">
      <Monogram className="mx-auto w-16" />
      <h1 className="mt-6 text-2xl font-bold">ثبّت متجر الجمال على هاتفك</h1>
      <p className="mt-3 text-sm leading-7 text-muted">افتح المتجر من الشاشة الرئيسية كتطبيق، وتابع طلباتك وإشعاراتك ودفعك بسهولة. لا يحتاج متجر تطبيقات ولا مساحة كبيرة.</p>
      <div className="mt-8 flex justify-center"><InstallApp /></div>
    </div>
  );
}
