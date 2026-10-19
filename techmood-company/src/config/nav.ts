import type { IconName } from "@/components/Icon";
import type { Text } from "@/i18n/config";

/** The site's pages, in menu order. Paths are without the language prefix. */
export const NAV: { path: string; label: Text; icon: IconName }[] = [
  { path: "/", label: { ar: "الرئيسية", en: "Home" }, icon: "home" },
  { path: "/services", label: { ar: "الخدمات", en: "Services" }, icon: "grid" },
  { path: "/ventures", label: { ar: "المشاريع", en: "Ventures" }, icon: "layers" },
  { path: "/solutions", label: { ar: "الحلول", en: "Solutions" }, icon: "briefcase" },
  { path: "/about", label: { ar: "الشركة", en: "Company" }, icon: "building" },
  { path: "/contact", label: { ar: "تواصل", en: "Contact" }, icon: "chat" },
];

/** The phone's bottom bar: five tabs, ventures in the middle. */
export const BOTTOM_NAV = ["/", "/services", "/ventures", "/about", "/contact"];

export function isActive(current: string, path: string) {
  return path === "/" ? current === "/" : current === path || current.startsWith(`${path}/`);
}
