"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "tg-theme";
const listeners = new Set<() => void>();

function current(): "light" | "dark" {
  const set = document.documentElement.dataset.theme;
  if (set === "dark" || set === "light") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Light/dark switch, remembered on this device (localStorage). */
export function ThemeToggle() {
  const theme = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    current,
    () => "light" as const,
  );
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    listeners.forEach((l) => l());
  };
  return (
    <button type="button" className="icon-button" onClick={toggle} aria-label={theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}>
      {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}
