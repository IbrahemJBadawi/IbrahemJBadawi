"use client";

import { BookOpen, Check, ChevronLeft, Copy, HeartHandshake, Link2, Plus, RefreshCw, Share2, ShieldCheck, Trash2, Trophy, UsersRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { CHALLENGE_KINDS, challengeDays, challengeIsActive, challengeScore, parseInvite, parseReport, type ChallengeInvite } from "@/lib/challenges";
import { dayKey, parseDayKey } from "@/lib/date";
import { createChallenge, importChallengeReport, markChallengeDay, removeChallenge } from "@/lib/store/actions";
import { getState, useHydrated, useStore } from "@/lib/store/store";
import type { ChallengeKind, DuoChallenge } from "@/lib/store/types";

function shareUrl(key: "invite" | "report", payload: object) {
  const url = new URL("/khalili", window.location.origin);
  url.searchParams.set(key, JSON.stringify(payload));
  return url.toString();
}

function ChallengeCard({ challenge, onShare }: { challenge: DuoChallenge; onShare: (url: string, label: string) => void }) {
  const today = dayKey();
  const days = challengeDays(challenge);
  const myScore = challengeScore(challenge.myCheckins, days);
  const partnerScore = challengeScore(challenge.partnerCheckins, days);
  const active = challengeIsActive(challenge, today);
  const finished = today > days[days.length - 1];

  const invite = () => onShare(shareUrl("invite", { id: challenge.id, kind: challenge.kind, days: challenge.days, startDate: challenge.startDate, hostName: challenge.myName }), "رابط دعوة خليلك");
  const report = () => onShare(shareUrl("report", { id: challenge.id, sender: challenge.myName, completedDays: days.filter((d) => challenge.myCheckins[d]) }), "رابط تحديث تقدمك");

  return (
    <Card className="card-soft overflow-hidden border-transparent p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2 px-5 py-4">
        <div><p className="text-xs font-semibold text-accent">{CHALLENGE_KINDS[challenge.kind].label}</p><h2 className="text-lg font-bold">تحدّي {challenge.myName} و{challenge.partnerName}</h2></div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${finished ? "bg-gold-soft text-gold-fg" : active ? "bg-accent-soft text-success" : "bg-surface text-muted"}`}>{finished ? "انتهت المدة" : active ? "جارٍ التحدّي" : "لم يبدأ بعد"}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-5 py-6 text-center sm:px-8">
        <div><p className="truncate text-sm font-bold">{challenge.myName}</p><p className="mt-2 text-4xl font-bold tabular-nums text-primary">{myScore}</p><p className="text-xs text-muted">أيام مكتملة</p></div>
        <span className="grid h-12 w-12 place-items-center rounded-full bg-gold-soft font-naskh text-xl font-bold text-gold-fg">معًا</span>
        <div><p className="truncate text-sm font-bold">{challenge.partnerName}</p><p className="mt-2 text-4xl font-bold tabular-nums text-accent">{partnerScore}</p><p className="text-xs text-muted">أيام مكتملة</p></div>
      </div>
      <p className="px-5 text-center text-sm text-muted">{CHALLENGE_KINDS[challenge.kind].description}. التقدّم بتسجيلكما الذاتي.</p>
      <div className="mx-5 mb-5 mt-5 space-y-2 rounded-2xl bg-bg p-3 sm:mx-8 sm:p-4">
        <div className="mb-2 flex items-center justify-between text-xs font-bold text-muted"><span>متابعة الأيام</span><span>{days.length} يومًا</span></div>
        {days.map((date, index) => {
          const mine = !!challenge.myCheckins[date];
          const theirs = !!challenge.partnerCheckins[date];
          const future = date > today;
          return (
            <div key={date} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl bg-surface px-3 py-2.5">
              <div><p className="text-sm font-bold">اليوم {index + 1}</p><p className="text-xs text-muted">{new Intl.DateTimeFormat("ar", { weekday: "long", month: "short", day: "numeric" }).format(parseDayKey(date))}</p></div>
              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${theirs ? "bg-accent-soft text-success" : "bg-surface-2 text-muted"}`} title="تقدم الخليل المبلّغ عنه">{theirs ? "الخليل ✓" : "الخليل —"}</span>
              <button type="button" disabled={future} aria-pressed={mine} onClick={() => markChallengeDay(challenge.id, date, !mine)} className={`inline-flex min-w-20 items-center justify-center gap-1 rounded-full px-3 py-2 text-xs font-bold focus-ring disabled:cursor-not-allowed disabled:opacity-40 ${mine ? "bg-primary text-primary-fg" : "border border-line bg-surface-2 text-fg"}`}>
                {mine && <Check className="h-3 w-3" />}{mine ? "أنجزت" : future ? "قادم" : "سجّل إنجازك"}
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-line px-5 py-4 sm:px-8">
        <Button variant="secondary" size="sm" onClick={invite}><Share2 className="h-4 w-4" /> دعوة الخليل</Button>
        <Button variant="outline" size="sm" onClick={report}><RefreshCw className="h-4 w-4" /> مشاركة تقدمي</Button>
        <Button variant="ghost" size="sm" className="mr-auto text-danger" onClick={() => { if (window.confirm("هل تريد حذف هذا التحدّي من جهازك؟")) removeChallenge(challenge.id); }}><Trash2 className="h-4 w-4" /> حذف</Button>
      </div>
    </Card>
  );
}

export function KhaliliView() {
  const hydrated = useHydrated();
  const challenges = useStore((s) => s.challenges);
  const toast = useToast();
  const [kind, setKind] = useState<ChallengeKind>("reading");
  const [myName, setMyName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [duration, setDuration] = useState(7);
  const [invite, setInvite] = useState<ChallengeInvite | null>(null);
  const [incomingError, setIncomingError] = useState("");
  const [shared, setShared] = useState<{ label: string; url: string } | null>(null);

  useEffect(() => {
    // قراءة دعوة المتصفح حدث خارجي، لذا نؤجل تحديث حالة الواجهة إلى إطار الرسم التالي.
    const frame = window.requestAnimationFrame(() => {
    const query = new URLSearchParams(window.location.search);
    const rawInvite = query.get("invite");
    const rawReport = query.get("report");
    if (rawInvite) {
      const found = parseInvite(rawInvite);
      if (found) {
        if (getState().challenges[found.id] && !getState().challenges[found.id].deleted) toast("هذا التحدّي موجود على جهازك بالفعل");
        else { setInvite(found); setPartnerName(found.hostName); setKind(found.kind); setDuration(found.days); }
      } else setIncomingError("رابط الدعوة غير صحيح أو منتهي الصلاحية.");
    } else if (rawReport) {
      const found = parseReport(rawReport);
      const c = found && getState().challenges[found.id];
      if (found && c && !c.deleted && found.sender === c.partnerName) {
        importChallengeReport(found.id, found.completedDays);
        toast("تحدّث تقدّم خليلك من الرابط الذي أرسله");
      } else setIncomingError("لا يمكن استيراد التحديث: افتح رابطًا لتحدٍّ موجود ومرسلٍ يطابق اسم الخليل.");
    }
    if (rawInvite || rawReport) window.history.replaceState({}, "", "/khalili");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [toast]);

  const create = (incoming?: ChallengeInvite) => {
    const first = myName.trim();
    const second = incoming?.hostName ?? partnerName.trim();
    if (first.length < 2 || first.length > 40 || second.length < 2 || second.length > 40) return toast("اكتب اسمين من حرفين إلى 40 حرفًا", "error");
    if (first === second) return toast("اختر اسمين مختلفين للتمييز بين الطرفين", "error");
    const id = createChallenge({
      id: incoming?.id ?? crypto.randomUUID(),
      kind: incoming?.kind ?? kind,
      myName: first,
      partnerName: second,
      startDate: incoming?.startDate ?? dayKey(),
      days: incoming?.days ?? duration,
    });
    setInvite(null);
    setPartnerName("");
    toast(incoming ? "انضممت للتحدّي على هذا الجهاز" : "أنشأت تحدّيًا جديدًا");
    if (!incoming) {
      const c = getState().challenges[id];
      setShared({ label: "رابط دعوة خليلك", url: shareUrl("invite", { id: c.id, kind: c.kind, days: c.days, startDate: c.startDate, hostName: c.myName }) });
    }
  };

  const share = (url: string, label: string) => {
    setShared({ url, label });
    if (navigator.clipboard?.writeText) void navigator.clipboard.writeText(url).then(() => toast("نُسخ الرابط؛ أرسله إلى خليلك")).catch(() => {});
  };

  const list = Object.values(challenges).filter((c) => !c.deleted).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6">
      <section className="khalili-hero relative overflow-hidden rounded-[2rem] p-6 sm:p-9">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-bold text-deep"><HeartHandshake className="h-4 w-4" /> رفقة في الخير</span>
          <h1 className="mt-4 font-naskh text-4xl font-bold leading-[1.4] text-deep sm:text-5xl">خليلي... نتشجّع سويًا</h1>
          <p className="mt-3 max-w-xl text-sm leading-8 text-[#395444] sm:text-base">اختر صديقًا وهدفًا بسيطًا للقراءة أو الحفظ أو المراجعة. تحدٍّ لطيف يذكّركما بالاستمرار، لا منافسة على قيمة العبادة.</p>
          <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-deep"><UsersRound className="h-5 w-5" /> تحدّيات ثنائية اختيارية</div>
        </div>
        <div className="khalili-ornament" aria-hidden="true"><BookOpen className="h-24 w-24" /></div>
      </section>

      {incomingError && <p role="alert" className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">{incomingError}</p>}

      <Card className="border-transparent shadow-soft">
        <div className="mb-5 flex items-center gap-2"><Plus className="h-5 w-5 text-accent" /><h2 className="text-lg font-bold">{invite ? `دعوة من ${invite.hostName}` : "أنشئ تحدّيًا مع خليلك"}</h2></div>
        {invite && <p className="mb-4 rounded-xl bg-accent-soft p-3 text-sm">يدعوك {invite.hostName} إلى تحدّي {CHALLENGE_KINDS[invite.kind].label} لمدة {invite.days} أيام ابتداءً من {invite.startDate}. أدخل اسمك للانضمام.</p>}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-bold">اسمك
            <input maxLength={40} value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="مثلًا: إبراهيم" className="mt-2 block h-12 w-full rounded-xl border border-line bg-bg px-4 font-normal outline-none focus:border-accent" />
          </label>
          <label className="block text-sm font-bold">اسم الخليل
            <input maxLength={40} value={invite?.hostName ?? partnerName} onChange={(e) => setPartnerName(e.target.value)} disabled={!!invite} placeholder="اسم الصديق" className="mt-2 block h-12 w-full rounded-xl border border-line bg-bg px-4 font-normal outline-none focus:border-accent disabled:opacity-70" />
          </label>
        </div>
        {!invite && <>
          <p className="mb-2 mt-5 text-sm font-bold">نوع التحدّي</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(CHALLENGE_KINDS) as ChallengeKind[]).map((key) => <button key={key} type="button" aria-pressed={kind === key} onClick={() => setKind(key)} className={`rounded-2xl border p-3 text-right focus-ring ${kind === key ? "border-accent bg-accent-soft" : "border-line bg-bg"}`}><span className="block text-sm font-bold">{CHALLENGE_KINDS[key].label}</span><span className="mt-1 block text-xs leading-5 text-muted">{CHALLENGE_KINDS[key].description}</span></button>)}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3"><span className="text-sm font-bold">المدة</span>{[3, 7, 14, 30].map((n) => <button key={n} type="button" aria-pressed={duration === n} onClick={() => setDuration(n)} className={`rounded-full px-3 py-1.5 text-sm font-bold focus-ring ${duration === n ? "bg-primary text-primary-fg" : "bg-surface-2 text-fg"}`}>{n} أيام</button>)}</div>
        </>}
        <div className="mt-6 flex flex-wrap gap-2"><Button onClick={() => create(invite ?? undefined)}><Plus className="h-4 w-4" />{invite ? "انضم للتحدّي" : "أنشئ التحدّي"}</Button>{invite && <Button variant="ghost" onClick={() => setInvite(null)}>إلغاء</Button>}</div>
      </Card>

      {shared && <Card className="border-accent/40 bg-accent-soft">
        <div className="mb-2 flex items-center gap-2 font-bold"><Link2 className="h-4 w-4" />{shared.label}</div>
        <p className="mb-3 text-sm text-muted">انسخ الرابط وابعثه في واتساب أو أي تطبيق مراسلة. عند إرسال تحديث تقدّمك، يجب أن يفتح خليلك الرابط لاستيراده.</p>
        <div className="flex flex-col gap-2 sm:flex-row"><input readOnly dir="ltr" value={shared.url} onFocus={(e) => e.target.select()} aria-label={shared.label} className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-xs" /><Button size="sm" onClick={() => share(shared.url, shared.label)}><Copy className="h-4 w-4" /> نسخ</Button></div>
      </Card>}

      {hydrated && list.length > 0 ? <section className="space-y-5"><h2 className="flex items-center gap-2 text-xl font-bold"><Trophy className="h-5 w-5 text-gold-fg" /> تحدّياتك</h2>{list.map((c) => <ChallengeCard key={c.id} challenge={c} onShare={share} />)}</section> : <div className="rounded-2xl border border-dashed border-line p-8 text-center"><HeartHandshake className="mx-auto mb-3 h-8 w-8 text-accent" /><p className="font-bold">ابدأ أول تحدٍّ مع شخص تحبه</p><p className="mt-1 text-sm text-muted">سجّل يومك أولًا، وشارك الرابط مع خليلك لتتشجعا معًا.</p></div>}

      <section className="rounded-[1.5rem] bg-surface-2 p-5 text-sm leading-7">
        <h2 className="mb-2 flex items-center gap-2 font-bold"><ShieldCheck className="h-5 w-5 text-success" /> كيف تعمل المنافسة الآن؟</h2>
        <ul className="list-disc space-y-1 pr-6 text-muted"><li>كل شخص يسجّل إنجازه على جهازه ويشارك «رابط تحديث تقدّمي» مع الآخر.</li><li>يفتح الخليل رابط التحديث ليظهر تقدّمك عنده؛ لا توجد مزامنة فورية بين الأجهزة قبل تفعيل الحسابات وقاعدة البيانات.</li><li>لا تُشارك خواطرك أو تفاصيل خلوتك، ولا تُحوّل التوبة والخشوع إلى نقاط أو ترتيب.</li></ul>
        <Link href="/profile" className="mt-3 inline-flex items-center gap-1 font-bold text-primary focus-ring">إعداد تذكيرات التحدّي <ChevronLeft className="h-4 w-4" /></Link>
      </section>
    </div>
  );
}
