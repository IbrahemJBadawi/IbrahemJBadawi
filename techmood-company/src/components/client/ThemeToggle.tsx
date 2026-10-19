"use client";

import { useEffect } from "react";
import { Icon } from "@/components/Icon";
import { useT } from "@/i18n/client";
import { STORAGE_KEYS, readStorage, useStored } from "@/lib/storage";
import { applyTheme, type ThemeChoice } from "@/lib/theme";

export function useTheme() {
  const [choice, setChoice] = useStored<ThemeChoice>(STORAGE_KEYS.theme, "system");
  // The <head> script already applied the saved choice before paint; this only
  // follows the device while the choice is "system".
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const follow = () => {
      if (readStorage<ThemeChoice>(STORAGE_KEYS.theme, "system") === "system") applyTheme("system");
    };
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, []);
  const choose = (next: ThemeChoice) => {
    setChoice(next);
    applyTheme(next);
  };
  return [choice, choose] as const;
}

/** One tap flips between light and dark (the /app page also offers "follow the device"). */
export function ThemeToggle() {
  const t = useT();
  const [, setChoice] = useTheme();
  function toggle() {
    const dark = document.documentElement.dataset.theme === "dark";
    setChoice(dark ? "light" : "dark");
  }
  return (
    <button type="button" className="icon-btn theme-toggle" onClick={toggle} aria-label={t("تبديل الوضع الفاتح والداكن", "Switch light and dark mode")}>
      <span className="theme-icon-dark"><Icon name="moon" size={19} /></span>
      <span className="theme-icon-light"><Icon name="sun" size={19} /></span>
    </button>
  );
}

export function ThemeChoicePicker() {
  const t = useT();
  const [choice, setChoice] = useTheme();
  const options: { value: ThemeChoice; label: string }[] = [
    { value: "light", label: t("فاتح", "Light") },
    { value: "dark", label: t("داكن", "Dark") },
    { value: "system", label: t("حسب الجهاز", "Device") },
  ];
  return (
    <div className="segmented" role="group" aria-label={t("المظهر", "Appearance")}>
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={choice === option.value} onClick={() => setChoice(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}
