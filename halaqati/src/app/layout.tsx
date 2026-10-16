import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { publicEnv } from "@/lib/env";
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
  themeColor: "#075b46",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:right-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
          تخطَّ إلى المحتوى
        </a>
        {children}
      </body>
    </html>
  );
}
