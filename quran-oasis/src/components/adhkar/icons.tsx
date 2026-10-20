import { HandHeart, Moon, Sun, Sunrise, Sunset, type LucideIcon } from "lucide-react";
import { Prayer } from "./PrayerIcon";

export const CATEGORY_ICONS: Record<string, LucideIcon | typeof Prayer> = {
  sunrise: Sunrise,
  sunset: Sunset,
  prayer: Prayer,
  moon: Moon,
  sun: Sun,
  hands: HandHeart,
};
