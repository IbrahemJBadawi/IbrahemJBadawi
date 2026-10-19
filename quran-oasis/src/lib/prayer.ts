/**
 * مواقيت الصلاة واتجاه القبلة — تُحسب على الجهاز بالكامل عبر مكتبة adhan (MIT)
 * دون أي طلب لخادم. المواقيت فلكية تقريبية، ويُنصح باعتماد تقويم البلد أو المسجد عند الاختلاف.
 */
import { CalculationMethod, Coordinates, Madhab, PrayerTimes, Qibla } from "adhan";
import type { DeviceLocation, DeviceState, MethodId, PrayerKey } from "./device";

export const PRAYER_NAMES: Record<PrayerKey, string> = {
  fajr: "الفجر",
  sunrise: "الشروق",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

export const PRAYER_ORDER: PrayerKey[] = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
/** الصلوات المفروضة (دون الشروق) */
export const FARD: PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

export const METHODS: { id: MethodId; label: string }[] = [
  { id: "UmmAlQura", label: "أم القرى (السعودية)" },
  { id: "Egyptian", label: "الهيئة المصرية العامة للمساحة" },
  { id: "MuslimWorldLeague", label: "رابطة العالم الإسلامي" },
  { id: "Kuwait", label: "الكويت" },
  { id: "Qatar", label: "قطر" },
  { id: "Dubai", label: "الإمارات" },
  { id: "Turkey", label: "تركيا (ديانت)" },
  { id: "Karachi", label: "جامعة العلوم الإسلامية بكراتشي" },
  { id: "Singapore", label: "سنغافورة / ماليزيا / إندونيسيا" },
  { id: "NorthAmerica", label: "أمريكا الشمالية (ISNA)" },
  { id: "MoonsightingCommittee", label: "لجنة رؤية الهلال" },
];

export interface City extends Omit<DeviceLocation, "source"> {
  country: string;
  method: MethodId;
}

const c = (label: string, country: string, lat: number, lon: number, tz: string, method: MethodId): City => ({
  label,
  country,
  lat,
  lon,
  tz,
  method,
});

export const CITIES: City[] = [
  c("مكة المكرمة", "السعودية", 21.4225, 39.8262, "Asia/Riyadh", "UmmAlQura"),
  c("المدينة المنورة", "السعودية", 24.4686, 39.6142, "Asia/Riyadh", "UmmAlQura"),
  c("الرياض", "السعودية", 24.7136, 46.6753, "Asia/Riyadh", "UmmAlQura"),
  c("جدة", "السعودية", 21.4858, 39.1925, "Asia/Riyadh", "UmmAlQura"),
  c("الدمام", "السعودية", 26.4207, 50.0888, "Asia/Riyadh", "UmmAlQura"),
  c("الكويت", "الكويت", 29.3759, 47.9774, "Asia/Kuwait", "Kuwait"),
  c("الدوحة", "قطر", 25.2854, 51.531, "Asia/Qatar", "Qatar"),
  c("المنامة", "البحرين", 26.2285, 50.586, "Asia/Bahrain", "UmmAlQura"),
  c("أبوظبي", "الإمارات", 24.4539, 54.3773, "Asia/Dubai", "Dubai"),
  c("دبي", "الإمارات", 25.2048, 55.2708, "Asia/Dubai", "Dubai"),
  c("مسقط", "عُمان", 23.588, 58.3829, "Asia/Muscat", "MuslimWorldLeague"),
  c("صنعاء", "اليمن", 15.3694, 44.191, "Asia/Aden", "MuslimWorldLeague"),
  c("عمّان", "الأردن", 31.9454, 35.9284, "Asia/Amman", "Egyptian"),
  c("القدس", "فلسطين", 31.7683, 35.2137, "Asia/Jerusalem", "Egyptian"),
  c("غزة", "فلسطين", 31.5017, 34.4668, "Asia/Gaza", "Egyptian"),
  c("دمشق", "سوريا", 33.5138, 36.2765, "Asia/Damascus", "Egyptian"),
  c("بيروت", "لبنان", 33.8938, 35.5018, "Asia/Beirut", "MuslimWorldLeague"),
  c("بغداد", "العراق", 33.3152, 44.3661, "Asia/Baghdad", "MuslimWorldLeague"),
  c("القاهرة", "مصر", 30.0444, 31.2357, "Africa/Cairo", "Egyptian"),
  c("الإسكندرية", "مصر", 31.2001, 29.9187, "Africa/Cairo", "Egyptian"),
  c("الخرطوم", "السودان", 15.5007, 32.5599, "Africa/Khartoum", "Egyptian"),
  c("طرابلس", "ليبيا", 32.8872, 13.1913, "Africa/Tripoli", "Egyptian"),
  c("تونس", "تونس", 36.8065, 10.1815, "Africa/Tunis", "MuslimWorldLeague"),
  c("الجزائر", "الجزائر", 36.7538, 3.0588, "Africa/Algiers", "MuslimWorldLeague"),
  c("الرباط", "المغرب", 34.0209, -6.8416, "Africa/Casablanca", "MuslimWorldLeague"),
  c("الدار البيضاء", "المغرب", 33.5731, -7.5898, "Africa/Casablanca", "MuslimWorldLeague"),
  c("نواكشوط", "موريتانيا", 18.0735, -15.9582, "Africa/Nouakchott", "MuslimWorldLeague"),
  c("إسطنبول", "تركيا", 41.0082, 28.9784, "Europe/Istanbul", "Turkey"),
  c("كراتشي", "باكستان", 24.8607, 67.0011, "Asia/Karachi", "Karachi"),
  c("إسلام آباد", "باكستان", 33.6844, 73.0479, "Asia/Karachi", "Karachi"),
  c("دكا", "بنغلاديش", 23.8103, 90.4125, "Asia/Dhaka", "Karachi"),
  c("جاكرتا", "إندونيسيا", -6.2088, 106.8456, "Asia/Jakarta", "Singapore"),
  c("كوالالمبور", "ماليزيا", 3.139, 101.6869, "Asia/Kuala_Lumpur", "Singapore"),
  c("لندن", "المملكة المتحدة", 51.5074, -0.1278, "Europe/London", "MoonsightingCommittee"),
  c("باريس", "فرنسا", 48.8566, 2.3522, "Europe/Paris", "MuslimWorldLeague"),
  c("برلين", "ألمانيا", 52.52, 13.405, "Europe/Berlin", "MuslimWorldLeague"),
  c("نيويورك", "الولايات المتحدة", 40.7128, -74.006, "America/New_York", "NorthAmerica"),
  c("تورونتو", "كندا", 43.6532, -79.3832, "America/Toronto", "NorthAmerica"),
];

/** يقترح طريقة حساب بحسب المنطقة الزمنية للجهاز (عند استخدام GPS). */
export function suggestMethod(tz: string): MethodId {
  const city = CITIES.find((x) => x.tz === tz);
  if (city) return city.method;
  if (tz.startsWith("America/")) return "NorthAmerica";
  if (tz.startsWith("Europe/")) return "MuslimWorldLeague";
  return "MuslimWorldLeague";
}

export interface PrayerTime {
  key: PrayerKey;
  name: string;
  time: Date;
}

function params(s: Pick<DeviceState, "method" | "madhab" | "adjust">) {
  const p = CalculationMethod[s.method]();
  p.madhab = s.madhab === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
  p.adjustments = { ...p.adjustments, ...s.adjust };
  return p;
}

/**
 * التاريخ المطلوب يُفسَّر بتقويم المدينة (tz)، لا بتقويم الجهاز،
 * حتى تكون مواقيت "اليوم" صحيحة إن اختار المستخدم مدينة في منطقة زمنية أخرى.
 */
function dateInTz(at: Date, tz: string): Date {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
  const [y, m, d] = parts.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function prayerTimesFor(
  s: Pick<DeviceState, "location" | "method" | "madhab" | "adjust">,
  at: Date = new Date(),
  dayOffset = 0,
): PrayerTime[] | null {
  if (!s.location) return null;
  const day = dateInTz(at, s.location.tz);
  day.setDate(day.getDate() + dayOffset);
  const t = new PrayerTimes(new Coordinates(s.location.lat, s.location.lon), day, params(s));
  return PRAYER_ORDER.map((key) => ({ key, name: PRAYER_NAMES[key], time: t[key] }));
}

/** الصلاة القادمة (يتجاوز الشروق)، ومعها الصلاة الحالية. */
export function nextPrayer(s: Pick<DeviceState, "location" | "method" | "madhab" | "adjust">, now: Date = new Date()) {
  const today = prayerTimesFor(s, now);
  if (!today) return null;
  const fard = today.filter((p) => p.key !== "sunrise");
  let next = fard.find((p) => p.time > now);
  if (!next) next = prayerTimesFor(s, now, 1)!.find((p) => p.key === "fajr")!;
  const prevList = fard.filter((p) => p.time <= now);
  const current = prevList[prevList.length - 1] ?? null;
  return { next, current, remainingMs: next.time.getTime() - now.getTime(), today };
}

export function formatTime(d: Date, tz?: string): string {
  return new Intl.DateTimeFormat("ar", { hour: "numeric", minute: "2-digit", timeZone: tz }).format(d);
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

const KAABA = { lat: 21.4225, lon: 39.8262 };

export function qiblaBearing(lat: number, lon: number): number {
  return Qibla(new Coordinates(lat, lon));
}

/** المسافة إلى الكعبة المشرفة بالكيلومتر (معادلة هافرساين). */
export function distanceToKaaba(lat: number, lon: number): number {
  const R = 6371;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(KAABA.lat - lat);
  const dLon = rad(KAABA.lon - lon);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(KAABA.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
