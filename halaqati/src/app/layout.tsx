import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { publicEnv } from "@/lib/env";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorker";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  display: "swap",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: { default: "حلقتي | Halaqati — رحلتك مع القرآن", template: "%s | حلقتي" },
  description: "منصة حلقتي لإدارة حلقات تحفيظ القرآن الكريم ومتابعة رحلة الطالب مع المحفّظين وأولياء الأمور والمراكز.",
  applicationName: "حلقتي",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#075b46" },
    { media: "(prefers-color-scheme: dark)", color: "#07110d" },
  ],
};

/** Applies the saved theme before first paint (no flash). */
const THEME_INIT = `try{var t=localStorage.getItem("halaqati-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <a href="#main" className="skip-link">
          تخطَّ إلى المحتوى
        </a>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
