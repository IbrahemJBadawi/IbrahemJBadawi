import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "حلقتي | Halaqati",
    short_name: "حلقتي",
    description: "رحلتك مع القرآن — حلقات التحفيظ والمراجعة",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    dir: "rtl",
    lang: "ar",
    background_color: "#faf9f4",
    theme_color: "#075b46",
    icons: [
      { src: "/brand/halaqati-mark-256.png", sizes: "256x256", type: "image/png", purpose: "any" },
      { src: "/brand/halaqati-mark-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
