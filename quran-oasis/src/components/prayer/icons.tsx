import { CloudSun, Moon, MoonStar, Sun, Sunrise, Sunset, type LucideIcon } from "lucide-react";
import type { PrayerKey } from "@/lib/device";

export const PRAYER_ICONS: Record<PrayerKey, LucideIcon> = {
  fajr: MoonStar,
  sunrise: Sunrise,
  dhuhr: Sun,
  asr: CloudSun,
  maghrib: Sunset,
  isha: Moon,
};

export const PRAYER_TINTS: Record<PrayerKey, string> = {
  fajr: "bg-tint-sky",
  sunrise: "bg-tint-apricot",
  dhuhr: "bg-tint-sand",
  asr: "bg-tint-apricot",
  maghrib: "bg-tint-rose",
  isha: "bg-tint-sage",
};
