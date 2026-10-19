import { Logo } from "@/components/Logo";

export const metadata = { title: "لا يوجد اتصال" };

export default function Offline() {
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <Logo size={44} />
      <h1 className="mt-6 text-2xl font-extrabold">أنت غير متصل بالإنترنت</h1>
      <p className="mt-2 max-w-md text-muted">لحماية بيانات عملائك لا نحفظ صفحات لوحة التحكم على الجهاز. أعد الاتصال ثم حدّث الصفحة.</p>
    </main>
  );
}
