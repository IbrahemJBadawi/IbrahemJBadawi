import type { Locale } from "@/i18n/config";
import type { VentureStatus } from "@/data/ventures";

const LABELS: Record<VentureStatus, { ar: string; en: string }> = {
  live: { ar: "متاح", en: "Live" },
  beta: { ar: "تجريبي", en: "Beta" },
  "in-development": { ar: "قيد التطوير", en: "In development" },
  planned: { ar: "مرحلة التخطيط", en: "Planning stage" },
};

const DESCRIPTIONS: Record<VentureStatus, { ar: string; en: string }> = {
  live: { ar: "منشور ومتاح للجميع.", en: "Released and open to everyone." },
  beta: { ar: "منشور ويمكن استخدامه، وما زال العمل جاريًا على استكماله.", en: "Deployed and usable, still being completed." },
  "in-development": { ar: "يجري بناؤه حاليًا ولم يُطلق بعد.", en: "Being built; not released yet." },
  planned: { ar: "فكرة في مرحلة التخطيط، لم يُبنَ منها شيء بعد.", en: "An idea at the planning stage; nothing built yet." },
};

export function statusLabel(status: VentureStatus, locale: Locale) {
  return LABELS[status][locale];
}

export function statusDescription(status: VentureStatus, locale: Locale) {
  return DESCRIPTIONS[status][locale];
}
