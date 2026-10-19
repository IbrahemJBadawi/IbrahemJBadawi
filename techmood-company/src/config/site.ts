/**
 * Everything about where the site lives, in one place.
 *
 * The final domain is not decided yet (techmoodtech.com belongs to the
 * TechMood Platform and is on hold at the registrar), so the origin comes from
 * NEXT_PUBLIC_SITE_URL. Until that is set, links are built from Vercel's
 * production URL (or localhost) and canonical URLs are left out, so search
 * engines are never told that a temporary address is the official one.
 */

function trimSlash(url: string) {
  return url.replace(/\/+$/, "");
}

const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

/** The origin used for absolute links (Open Graph, sitemap, JSON-LD). */
export const SITE_URL = trimSlash(configured || (vercel ? `https://${vercel}` : "http://localhost:3000"));

/** True only when the owner has confirmed the domain via NEXT_PUBLIC_SITE_URL. */
export const HAS_CONFIRMED_DOMAIN = Boolean(configured);

/** Search engines may index the site only when this is the confirmed production deployment. */
export const ALLOW_INDEXING = HAS_CONFIRMED_DOMAIN && process.env.NEXT_PUBLIC_ALLOW_INDEXING !== "false";

export function absoluteUrl(path: string) {
  return `${SITE_URL}${path === "/" ? "" : path}` || SITE_URL;
}
