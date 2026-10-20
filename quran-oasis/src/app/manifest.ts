import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "واحة القرآن — Quran Oasis",
    short_name: "واحة القرآن",
    description: "كل يوم خطوة أقرب إلى القرآن.",
    lang: "ar",
    dir: "rtl",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F8F6EF",
    theme_color: "#234334",
    categories: ["education", "lifestyle", "books"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "متابعة القراءة", url: "/quran", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "أذكار الصباح", url: "/adhkar/morning", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "أذكار المساء", url: "/adhkar/evening", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
