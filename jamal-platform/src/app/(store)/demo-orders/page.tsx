import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isBrowserLocalDemo } from "@/lib/db/core";
import { LocalDemoOrders } from "@/components/cart/LocalDemoOrders";

export const metadata: Metadata = { title: "طلباتي المحلية التجريبية", robots: { index: false } };

export default function DemoOrdersPage() {
  if (!isBrowserLocalDemo()) redirect("/");
  return (
    <div className="container-page max-w-3xl py-8 md:py-12">
      <h1 className="mb-3 text-2xl font-bold md:text-3xl">طلباتي المحلية التجريبية</h1>
      <p className="mb-8 text-sm leading-7 text-muted">سجل خاص بهذا المتصفح، للاختبار فقط. لا تُرسل الطلبات إلى أي خادم.</p>
      <LocalDemoOrders />
    </div>
  );
}
