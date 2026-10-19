import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "منصة الجمال | Al Jamal",
    short_name: "الجمال",
    description: "ملابس يومية من موردين محليين في فلسطين — تابع طلباتك ودفعك من هاتفك.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    dir: "rtl",
    lang: "ar",
    background_color: "#faf7f2",
    theme_color: "#1d1b18",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "طلباتي", url: "/account/orders" },
      { name: "تتبع الطلب", url: "/track" },
      { name: "الدعم", url: "/support" },
    ],
  };
}
