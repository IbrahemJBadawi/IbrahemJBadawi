import type { Metadata, Viewport } from "next";
import "@fontsource-variable/cairo";
import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/cormorant-garamond/latin-600.css";
import "./globals.css";
import { PwaRegister } from "@/components/pwa/PwaRegister";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Al JAMAL Store | متجر الجمال — ملابس يومية في فلسطين",
    template: "%s | متجر الجمال",
  },
  description:
    "Al JAMAL Store | متجر الجمال: متجر إلكتروني فلسطيني للملابس اليومية الأساسية من موردين محليين، مع تأكيد التوفر والسعر قبل الدفع.",
  applicationName: "Al JAMAL Store",
  appleWebApp: { capable: true, title: "الجمال", statusBarStyle: "default" },
  openGraph: {
    type: "website",
    locale: "ar_AR",
    siteName: "Al JAMAL Store | متجر الجمال",
  },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#faf7f2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
