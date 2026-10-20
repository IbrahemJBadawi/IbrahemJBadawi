/**
 * طبقة جلب نص القرآن. أي مصدر جديد يجب أن يطبّق QuranTextSource،
 * ويمكن تبديل المصدر دون تعديل الواجهات.
 *
 * المصدر الحالي: ملفات JSON ثابتة يولّدها scripts/build-quran-data.mjs
 * من نص مجمع الملك فهد بعد التحقق منه. تُخدم من /data/quran/{n}.json
 * فتعمل بسرعة وتُخزّن للاستخدام دون اتصال.
 */
import type { SurahText } from "./index";
import { getSurahMeta } from "./index";

export interface QuranTextSource {
  readonly id: string;
  getSurah(n: number, signal?: AbortSignal): Promise<SurahText>;
}

export class QuranLoadError extends Error {
  constructor(
    message: string,
    readonly offline: boolean,
  ) {
    super(message);
    this.name = "QuranLoadError";
  }
}

function validate(n: number, data: unknown): SurahText {
  const meta = getSurahMeta(n);
  const d = data as SurahText;
  if (!meta || !d || d.n !== n || !Array.isArray(d.ayahs) || d.ayahs.length !== meta.ayahs) {
    throw new QuranLoadError("بيانات السورة غير مكتملة أو غير صالحة.", false);
  }
  for (let i = 0; i < d.ayahs.length; i++) {
    if (d.ayahs[i].a !== i + 1 || typeof d.ayahs[i].t !== "string" || !d.ayahs[i].t) {
      throw new QuranLoadError("بيانات السورة غير مكتملة أو غير صالحة.", false);
    }
  }
  return d;
}

export const staticQuranSource: QuranTextSource = {
  id: "kfgqpc-hafs-v13-static",
  async getSurah(n, signal) {
    if (!getSurahMeta(n)) throw new QuranLoadError("رقم السورة غير صحيح.", false);
    let res: Response;
    try {
      res = await fetch(`/data/quran/${n}.json`, { signal });
    } catch (e) {
      if ((e as Error).name === "AbortError") throw e;
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      throw new QuranLoadError(
        offline
          ? "أنت غير متصل بالإنترنت، وهذه السورة غير محفوظة على جهازك بعد."
          : "تعذّر تحميل السورة. تحقق من الاتصال وحاول مرة أخرى.",
        offline,
      );
    }
    if (!res.ok) throw new QuranLoadError(`تعذّر تحميل السورة (رمز ${res.status}).`, false);
    return validate(n, await res.json());
  },
};

const cache = new Map<number, Promise<SurahText>>();

/** تحميل سورة مع ذاكرة مؤقتة داخل الجلسة. */
export function loadSurah(n: number, source: QuranTextSource = staticQuranSource): Promise<SurahText> {
  let p = cache.get(n);
  if (!p) {
    p = source.getSurah(n).catch((e) => {
      cache.delete(n);
      throw e;
    });
    cache.set(n, p);
  }
  return p;
}

/** يجلب نص آيات محددة (يُستخدم في الأذكار القرآنية ولحظة واحة والدروس). */
export async function loadAyahs(surah: number, from: number, to: number) {
  const s = await loadSurah(surah);
  return s.ayahs.slice(from - 1, to);
}
