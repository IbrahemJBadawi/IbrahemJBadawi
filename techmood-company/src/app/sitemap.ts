import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";
import { SERVICES } from "@/data/services";
import { VENTURES } from "@/data/ventures";
import { href } from "@/i18n/config";

const STATIC = ["/", "/about", "/services", "/ventures", "/solutions", "/contact", "/app", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [...STATIC, ...SERVICES.map((service) => `/services/${service.slug}`), ...VENTURES.map((venture) => `/ventures/${venture.slug}`)];
  const url = (path: string) => `${SITE_URL}${path === "/" ? "" : path}` || SITE_URL;
  return paths.map((path) => ({
    url: url(href("ar", path)),
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : path.split("/").length > 2 ? 0.6 : 0.8,
    alternates: { languages: { ar: url(href("ar", path)), en: url(href("en", path)) } },
  }));
}
