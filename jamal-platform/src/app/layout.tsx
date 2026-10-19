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
    default: "منصة الجمال | Al Jamal — ملابس يومية في فلسطين",
    template: "%s | منصة الجمال",
  },
  description:
    "منصة الجمال | Al Jamal: متجر إلكتروني فلسطيني للملابس اليومية الأساسية من موردين محليين، مع تأكيد التوفر والسعر قبل الدفع.",
  applicationName: "Al Jamal",
  appleWebApp: { capable: true, title: "الجمال", statusBarStyle: "default" },
  openGraph: {
    type: "website",
    locale: "ar_AR",
    siteName: "منصة الجمال | Al Jamal",
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
