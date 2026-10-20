import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/profile", "/auth", "/today", "/plan", "/hifz", "/stats", "/saved", "/welcome"] }],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
