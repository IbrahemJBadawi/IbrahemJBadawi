import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TechMood Technology",
    short_name: "TechMood",
    description: "Building Future Digital Leaders — AI-Powered Technology Ecosystem for the Future of Work.",
    start_url: "/",
    scope: "/",
    id: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1d4ed8",
    lang: "ar",
    dir: "rtl",
    categories: ["business", "education", "productivity"],
    icons: [
      { src: "/brand/logo-mark.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/logo.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
    shortcuts: [
      { name: "المشاريع", url: "/ventures", icons: [{ src: "/brand/logo-mark.png", sizes: "192x192" }] },
      { name: "الخدمات", url: "/services", icons: [{ src: "/brand/logo-mark.png", sizes: "192x192" }] },
      { name: "تواصل", url: "/contact", icons: [{ src: "/brand/logo-mark.png", sizes: "192x192" }] },
    ],
  };
}
