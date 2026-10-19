/**
 * TechMood Technology — the facts the site is allowed to state.
 *
 * Edit here, not in the pages. Every link below was taken from the owner's
 * own repositories (the GitHub profile README and the TechMood Platform's
 * src/lib/contact.ts) or from the owner's brief. Nothing here is invented:
 * if a channel is not listed, the site does not show it.
 */

export const COMPANY = {
  name: "TechMood Technology",
  nameAr: "تيك مود للتكنولوجيا",
  shortName: "TechMood",
  tagline: "Building Future Digital Leaders",
  positioning: "AI-Powered Technology Ecosystem for the Future of Work",
  founder: "Ibrahem Jamal Hafez Badawi",
  founderAr: "إبراهيم جمال حافظ بدوي",
  /** ISO date — 18 June 2026 */
  foundingDate: "2026-06-18",
  country: "PS",
} as const;

/**
 * Where people can reach the company.
 * - email: the founder's public address from the GitHub profile. The
 *   platform's contact@techmoodtech.com is not used while that domain is on
 *   hold — mail to it may not arrive. Change this line when it is back.
 */
export const CONTACT = {
  email: "ibrahemjbadawi@gmail.com",
  telegramChannel: { handle: "@techmoodtech", href: "https://t.me/techmoodtech" },
  telegramCommunity: { handle: "@techmoodcom", href: "https://t.me/techmoodcom" },
} as const;

export type SocialKey = "telegram" | "facebook" | "instagram" | "tiktok" | "github" | "linkedin";

/** TechMood's own accounts (one handle everywhere — from the platform's config). */
export const SOCIAL_LINKS: { key: SocialKey; label: string; href: string }[] = [
  { key: "telegram", label: "Telegram", href: "https://t.me/techmoodtech" },
  { key: "facebook", label: "Facebook", href: "https://www.facebook.com/techmoodtech" },
  { key: "instagram", label: "Instagram", href: "https://www.instagram.com/techmoodtech" },
  { key: "tiktok", label: "TikTok", href: "https://www.tiktok.com/@techmoodtech" },
];

/** The founder's public profiles (from the GitHub profile README). */
export const FOUNDER_LINKS: { key: SocialKey; label: string; href: string }[] = [
  { key: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/ibrahemjbadawi" },
  { key: "github", label: "GitHub", href: "https://github.com/IbrahemJBadawi" },
];
