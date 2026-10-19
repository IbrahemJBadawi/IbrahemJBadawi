"use client";

import { usePathname } from "next/navigation";
import { stripLocale } from "@/i18n/config";

/** The current page's path without the language prefix ("/en/about" → "/about"). */
export function usePath() {
  return stripLocale(usePathname() || "/");
}
