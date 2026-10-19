"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "./config";

const LocaleContext = createContext<Locale>("ar");

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

/** Client-side translator: const t = useT(); t("نص", "text"). */
export function useT() {
  const locale = useLocale();
  return (ar: string, en: string) => (locale === "ar" ? ar : en);
}
