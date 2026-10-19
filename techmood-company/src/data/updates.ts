import type { Text } from "@/i18n/config";

/**
 * Company news, newest first. Shown on the home page and behind the bell in
 * the header. A visitor's browser remembers which ones it has seen (local
 * storage) and, if they turned notifications on, shows a device notification
 * for each new one the next time the site is opened.
 *
 * Give every entry a new, unique `id` — that is how "new" is decided.
 * Only facts: a date, what happened, and a link inside the site.
 */
export type Update = {
  id: string;
  date: string; // YYYY-MM-DD
  title: Text;
  body: Text;
  /** A path inside this site, without the language prefix. */
  path: string;
};

export const UPDATES: Update[] = [
  {
    id: "2026-10-website",
    date: "2026-10-19",
    title: { ar: "الموقع الرسمي لـ TechMood Technology", en: "TechMood Technology's official website" },
    body: {
      ar: "نسخة أولى من موقع الشركة الأم: الخدمات والمشاريع والتواصل في مكان واحد، بالعربية والإنجليزية.",
      en: "A first version of the parent company's website: services, ventures and contact in one place, in Arabic and English.",
    },
    path: "/",
  },
  {
    id: "2026-10-halaqati-beta",
    date: "2026-10-18",
    title: { ar: "حلقتي: تحديث الإصدار التجريبي", en: "Halaqati: beta update" },
    body: {
      ar: "قنوات للإدارة، وصور على الشهادات، وتصدير البيانات، ورسوم أسبوعية في لوحة كل دور.",
      en: "Staff channels, images on certificates, data exports and weekly charts on every role's home.",
    },
    path: "/ventures/halaqati",
  },
  {
    id: "2026-10-jamal-dev",
    date: "2026-10-16",
    title: { ar: "منصة الجمال: بدء تطوير النسخة الأولى", en: "Al Jamal: first version in development" },
    body: {
      ar: "متجر عربي للأزياء بلوحة إدارة للمنتجات والطلبات والموردين، قيد التطوير ولم يُطلق بعد.",
      en: "An Arabic fashion store with an admin dashboard for products, orders and suppliers — in development, not launched yet.",
    },
    path: "/ventures/al-jamal",
  },
  {
    id: "2026-06-founding",
    date: "2026-06-18",
    title: { ar: "تأسيس TechMood Technology", en: "TechMood Technology founded" },
    body: {
      ar: "تأسست الشركة في فلسطين لتطوير وإدارة منتجات ومشاريع وخدمات تقنية.",
      en: "The company was founded in Palestine to build and run technology products, ventures and services.",
    },
    path: "/about",
  },
];
