import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TechMood Growth",
    short_name: "Growth",
    description: "عملاؤك المحتملون ومواعيدك وتقاريرك في مكان واحد",
    lang: "ar",
    dir: "rtl",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f3f6fc",
    theme_color: "#1d4ed8",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "عميل جديد", url: "/dashboard/leads/new" },
      { name: "المواعيد", url: "/dashboard/appointments" },
    ],
  };
}
