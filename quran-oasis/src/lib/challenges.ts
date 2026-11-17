import { addDays } from "@/lib/date";
import type { ChallengeKind, DuoChallenge } from "@/lib/store/types";

export const CHALLENGE_KINDS: Record<ChallengeKind, { label: string; description: string }> = {
  reading: { label: "ورد القرآن", description: "تسجّلان يومًا أنجزتما فيه وردكما" },
  hifz: { label: "حفظ جديد", description: "تسجّلان يومًا خصصتما فيه وقتًا للحفظ" },
  review: { label: "مراجعة الحفظ", description: "تسجّلان يومًا راجعتما فيه محفوظكما" },
};

export interface ChallengeInvite {
  id: string;
  kind: ChallengeKind;
  days: number;
  startDate: string;
  hostName: string;
}

export interface ChallengeReport {
  id: string;
  sender: string;
  completedDays: string[];
}

const isDate = (x: unknown): x is string =>
  typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(new Date(`${x}T12:00:00`).getTime());
const isId = (x: unknown): x is string => typeof x === "string" && /^[a-zA-Z0-9-]{8,80}$/.test(x);
const isName = (x: unknown): x is string => typeof x === "string" && x.trim().length > 0 && x.length <= 40;

/** روابط الدعوات تحتوي على معلومات التحدي فقط، ولا تحتوي على تأملات الخلوة أو سجل العبادة. */
export function parseInvite(raw: string | null): ChallengeInvite | null {
  if (!raw || raw.length > 1000) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    const x = data as Partial<ChallengeInvite>;
    if (!isId(x.id) || !(x.kind && x.kind in CHALLENGE_KINDS) || !Number.isInteger(x.days) || x.days! < 1 || x.days! > 30 || !isDate(x.startDate) || !isName(x.hostName)) return null;
    return { id: x.id, kind: x.kind, days: x.days, startDate: x.startDate, hostName: x.hostName.trim() } as ChallengeInvite;
  } catch {
    return null;
  }
}

export function parseReport(raw: string | null): ChallengeReport | null {
  if (!raw || raw.length > 1600) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    const x = data as Partial<ChallengeReport>;
    if (!isId(x.id) || !isName(x.sender) || !Array.isArray(x.completedDays) || x.completedDays.length > 30 || !x.completedDays.every(isDate)) return null;
    return { id: x.id, sender: x.sender.trim(), completedDays: [...new Set(x.completedDays)] };
  } catch {
    return null;
  }
}

export function challengeDays(challenge: Pick<DuoChallenge, "startDate" | "days">) {
  return Array.from({ length: challenge.days }, (_, i) => addDays(challenge.startDate, i));
}

export function challengeScore(checkins: Record<string, boolean>, days: string[]) {
  return days.filter((day) => checkins[day] === true).length;
}

export function challengeIsActive(challenge: DuoChallenge, today: string) {
  return !challenge.deleted && today >= challenge.startDate && today < addDays(challenge.startDate, challenge.days);
}
