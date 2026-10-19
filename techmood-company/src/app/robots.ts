import type { MetadataRoute } from "next";
import { ALLOW_INDEXING, SITE_URL } from "@/config/site";

/** Indexing is allowed only on the confirmed production domain (see src/config/site.ts). */
export default function robots(): MetadataRoute.Robots {
  if (!ALLOW_INDEXING) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/lang/"] }, sitemap: `${SITE_URL}/sitemap.xml`, host: SITE_URL };
}
