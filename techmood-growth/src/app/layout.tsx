import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorker";
import "./globals.css";

const cairo = Cairo({ variable: "--font-arabic", subsets: ["arabic", "latin"], display: "swap", weight: ["400", "600", "700", "800"] });

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "TechMood Growth — نمِّ عملاءك بذكاء", template: "%s | TechMood Growth" },
  description: "منصة عربية لمراكز التدريب والشركات الخدمية: نماذج استقبال، إدارة العملاء المحتملين، مواعيد، وتقارير تحويل — من TechMood Technology.",
  applicationName: "TechMood Growth",
  appleWebApp: { capable: true, title: "Growth", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1d4ed8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1222" },
  ],
};

/** Applies the saved theme before first paint (no flash). */
const THEME_INIT = `try{var t=localStorage.getItem("tg-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="skip-link">تخطَّ إلى المحتوى</a>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
