import {
  CircleDot,
  Clock,
  Compass,
  Award,
  BookMarked,
  BookOpen,
  CalendarCheck,
  GraduationCap,
  Heart,
  Home,
  Leaf,
  Settings,
  Shield,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/today", label: "اليوم", icon: Home },
  { href: "/quran", label: "القرآن", icon: BookOpen },
  { href: "/prayer", label: "الصلاة", icon: Clock },
  { href: "/adhkar", label: "الأذكار", icon: Sparkles },
];

/** روابط إضافية في القائمة العلوية للحاسوب */
export const DESKTOP_EXTRA: NavItem[] = [
  { href: "/oasis", label: "لحظة واحة", icon: Leaf },
  { href: "/plan", label: "الورد", icon: CalendarCheck },
  { href: "/hifz", label: "الحفظ", icon: BookMarked },
  { href: "/learn", label: "التعلّم", icon: GraduationCap },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/oasis", label: "لحظة واحة", icon: Leaf },
  { href: "/tasbih", label: "المسبحة", icon: CircleDot },
  { href: "/qibla", label: "القبلة", icon: Compass },
  { href: "/plan", label: "الورد والخطة", icon: CalendarCheck },
  { href: "/hifz", label: "الحفظ والمراجعة", icon: BookMarked },
  { href: "/learn", label: "التعلّم", icon: GraduationCap },
  { href: "/stats", label: "الإنجازات", icon: Award },
  { href: "/saved", label: "المحفوظات", icon: Heart },
  { href: "/profile", label: "الملف والإعدادات", icon: Settings },
];

export const ADMIN_NAV: NavItem = { href: "/admin", label: "لوحة الإدارة", icon: Shield };

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}
