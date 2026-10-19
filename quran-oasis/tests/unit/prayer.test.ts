import { describe, expect, it } from "vitest";
import { DEFAULT_DEVICE, type DeviceState } from "@/lib/device";
import { CITIES, distanceToKaaba, formatCountdown, nextPrayer, prayerTimesFor, qiblaBearing } from "@/lib/prayer";
import { parseBackup } from "@/lib/store/persist";

const makkah: DeviceState = {
  ...DEFAULT_DEVICE,
  location: { lat: 21.4225, lon: 39.8262, label: "مكة", tz: "Asia/Riyadh", source: "city" },
  method: "UmmAlQura",
};
const hm = (d: Date, tz = "Asia/Riyadh") => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(d);

describe("مواقيت الصلاة (محلية)", () => {
  it("مكة 19 أكتوبر 2026 بطريقة أم القرى", () => {
    const t = prayerTimesFor(makkah, new Date("2026-10-19T09:00:00Z"))!;
    const map = Object.fromEntries(t.map((p) => [p.key, hm(p.time)]));
    expect(map).toEqual({ fajr: "05:01", sunrise: "06:18", dhuhr: "12:06", asr: "15:25", maghrib: "17:53", isha: "19:23" });
  });

  it("الصلاة القادمة بعد العشاء هي فجر الغد", () => {
    const np = nextPrayer(makkah, new Date("2026-10-19T18:30:00Z"))!; // 21:30 بتوقيت مكة
    expect(np.next.key).toBe("fajr");
    expect(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(np.next.time)).toBe("2026-10-20");
    expect(hm(np.next.time)).toBe("05:02");
    expect(np.current?.key).toBe("isha");
  });

  it("التعديل اليدوي بالدقائق", () => {
    const t = prayerTimesFor({ ...makkah, adjust: { ...makkah.adjust, maghrib: 3 } }, new Date("2026-10-19T09:00:00Z"))!;
    expect(hm(t.find((p) => p.key === "maghrib")!.time)).toBe("17:56");
  });

  it("اليوم يُحسب بتقويم المدينة لا الجهاز", () => {
    // 23:30 بتوقيت UTC يوم 18 = 02:30 يوم 19 في مكة → مواقيت يوم 19
    const t = prayerTimesFor(makkah, new Date("2026-10-18T23:30:00Z"))!;
    expect(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(t[0].time)).toBe("2026-10-19");
  });

  it("بدون موقع لا مواقيت", () => {
    expect(prayerTimesFor(DEFAULT_DEVICE)).toBeNull();
  });

  it("القبلة والمسافة", () => {
    expect(qiblaBearing(24.7136, 46.6753)).toBeCloseTo(243.8, 0);
    expect(Math.round(distanceToKaaba(24.7136, 46.6753))).toBeGreaterThan(780);
    expect(Math.round(distanceToKaaba(24.7136, 46.6753))).toBeLessThan(800);
    expect(qiblaBearing(51.5074, -0.1278)).toBeCloseTo(119, 0); // لندن
  });

  it("المدن: مناطق زمنية صالحة وإحداثيات معقولة", () => {
    for (const c of CITIES) {
      expect(() => new Intl.DateTimeFormat("en", { timeZone: c.tz })).not.toThrow();
      expect(Math.abs(c.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(c.lon)).toBeLessThanOrEqual(180);
    }
  });

  it("العدّ التنازلي", () => {
    expect(formatCountdown(3_661_000)).toBe("1:01:01");
    expect(formatCountdown(59_000)).toBe("00:59");
  });
});

describe("النسخ الاحتياطية", () => {
  it("يقبل الصيغة الحالية والقديمة ويرفض غيرها", () => {
    const cur = JSON.stringify({ app: "quran-oasis", version: 1, exportedAt: "x", data: { readingLog: { d: [[1, 7]] }, settings: { theme: "dark" } } });
    expect(parseBackup(cur).readingLog.d).toEqual([[1, 7]]);
    const old = JSON.stringify({ app: "quran-oasis", settings: { fontScale: 1.2 }, bookmarks: {} });
    expect(parseBackup(old).settings.fontScale).toBe(1.2);
    expect(() => parseBackup("not json")).toThrow(/JSON/);
    expect(() => parseBackup(JSON.stringify({ hello: 1 }))).toThrow(/ليس نسخة/);
  });
});
