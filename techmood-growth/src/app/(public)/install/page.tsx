import type { Metadata } from "next";
import { InstallButton } from "@/components/pwa/InstallButton";

export const metadata: Metadata = { title: "تثبيت التطبيق" };

export default function Install() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-extrabold">ثبّت TechMood Growth على جهازك</h1>
      <p className="mt-2 text-muted">تطبيق ويب خفيف: أيقونة على الشاشة الرئيسية، يفتح على لوحتك مباشرة، ويستقبل إشعارات الطلبات والحجوزات.</p>
      <div className="mt-6"><InstallButton variant="primary" /></div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <section className="surface p-5">
          <h2 className="font-bold">Android (Chrome / Edge)</h2>
          <ol className="mt-2 list-decimal ps-5 text-muted">
            <li>افتح الموقع ثم اضغط «تثبيت التطبيق» أعلاه.</li>
            <li>أو من القائمة ⋮ اختر «تثبيت التطبيق».</li>
          </ol>
        </section>
        <section className="surface p-5">
          <h2 className="font-bold">iPhone / iPad (Safari)</h2>
          <ol className="mt-2 list-decimal ps-5 text-muted">
            <li>اضغط زر المشاركة.</li>
            <li>اختر «إضافة إلى الشاشة الرئيسية».</li>
            <li>افتح التطبيق من الأيقونة، ثم فعّل الإشعارات من الإعدادات (iOS 16.4+).</li>
          </ol>
        </section>
        <section className="surface p-5 sm:col-span-2">
          <h2 className="font-bold">الحاسوب</h2>
          <p className="mt-1 text-muted">في Chrome أو Edge اضغط أيقونة التثبيت في شريط العنوان.</p>
        </section>
      </div>
    </div>
  );
}
