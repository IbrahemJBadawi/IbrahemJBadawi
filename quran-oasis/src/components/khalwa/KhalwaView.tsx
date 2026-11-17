"use client";

import { Check, ChevronLeft, Clock3, Heart, Leaf, Moon, Pause, Play, RotateCcw, Sparkles, BookOpen, HandHeart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ElementType } from "react";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/Progress";
import { useToast } from "@/components/ui/Toast";
import { dayKey } from "@/lib/date";
import { finishKhalwa, saveKhalwaReflection, saveKhalwaStage } from "@/lib/store/actions";
import { useHydrated, useStore } from "@/lib/store/store";
import type { KhalwaStageId } from "@/lib/store/types";

interface Stage {
  id: KhalwaStageId;
  title: string;
  subtitle: string;
  prompt: string;
  duration: number;
  icon: ElementType;
  href?: string;
  linkLabel?: string;
}

const STAGES: Stage[] = [
  { id: "prepare", title: "التهيئة والنية", subtitle: "تهيئة القلب والمكان", prompt: "اختر مكانًا هادئًا، أبعد المشتتات، واستحضر نيتك في هذه الجلسة. ليست هناك نتيجة مطلوب إثباتها.", duration: 1, icon: Moon },
  { id: "repent", title: "التوبة والاستغفار", subtitle: "بداية جديدة", prompt: "خذ وقتك في الاستغفار ومحاسبة النفس بلطف. ما بينك وبين الله لا تسجله هنا، ولا يراه غيرك.", duration: 3, icon: Heart },
  { id: "adhkar", title: "الأذكار", subtitle: "لسان ذاكر وقلب حاضر", prompt: "انتقل إلى الأذكار الموثقة في الواحة، واختر ما يناسب وقتك دون استعجال.", duration: 3, icon: Sparkles, href: "/adhkar", linkLabel: "افتح الأذكار" },
  { id: "quran", title: "تلاوة القرآن", subtitle: "اقرأ بطمأنينة", prompt: "تابع من آخر موضع في المصحف، أو افتح سورة تحب قراءتها. لا يشترط عدد معين من الآيات.", duration: 7, icon: BookOpen, href: "/quran", linkLabel: "افتح المصحف" },
  { id: "tadabbur", title: "التدبّر", subtitle: "قف عند معنى", prompt: "تأمل معنى آية في لحظة واحة بالرجوع إلى التفسير الموثق. الأسئلة التأملية مجرد مساعدة للتفكر، وليست تفسيرًا للقرآن.", duration: 2, icon: Leaf, href: "/oasis", linkLabel: "لحظة واحة" },
  { id: "dua", title: "الدعاء", subtitle: "اسأل الله من فضله", prompt: "ادعُ بما تحتاجه بقلب حاضر. تستطيع الاستفادة من الأدعية الموثقة في قسم الأذكار.", duration: 3, icon: HandHeart, href: "/adhkar/duas", linkLabel: "الأدعية المأثورة" },
  { id: "khushu", title: "السكينة والخشوع", subtitle: "ختام بلا استعجال", prompt: "اختم بدقائق من الهدوء، وفكّر في خطوة صغيرة تحافظ عليها بعد الجلسة. الخشوع معنى قلبي لا تقيسه المنصة.", duration: 1, icon: Moon },
];

const DURATIONS = [10, 20, 30];

function formatTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function KhalwaView() {
  const hydrated = useHydrated();
  const date = dayKey();
  const session = useStore((s) => s.khalwa[date]);
  const toast = useToast();
  const [active, setActive] = useState<KhalwaStageId>("prepare");
  const [duration, setDuration] = useState(20);
  const [seconds, setSeconds] = useState(60);
  const [running, setRunning] = useState(false);
  const note = session?.reflection ?? "";
  const stage = STAGES.find((x) => x.id === active)!;
  const completed = session?.completedStages ?? [];
  const doneCount = completed.filter((id) => STAGES.some((s) => s.id === id)).length;
  const done = doneCount === STAGES.length;

  const chooseStage = (id: KhalwaStageId) => {
    setActive(id);
    setRunning(false);
    const selected = STAGES.find((s) => s.id === id)!;
    setSeconds(Math.max(60, Math.round((selected.duration * duration / 20) * 60)));
  };

  const chooseDuration = (value: number) => {
    setDuration(value);
    setRunning(false);
    setSeconds(Math.max(60, Math.round((stage.duration * value / 20) * 60)));
  };

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          setRunning(false);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const mark = () => {
    const isCompleted = completed.includes(active);
    saveKhalwaStage(active, !isCompleted, duration, date);
    setRunning(false);
    if (!isCompleted) {
      const next = STAGES.find((s) => !completed.includes(s.id) && s.id !== active);
      if (next) chooseStage(next.id);
      else toast("أنهيت مراحل الجلسة. يمكنك الآن ختام خلوتك.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="khalwa-hero relative overflow-hidden rounded-[2rem] px-5 py-8 text-ivory sm:px-9 sm:py-10">
        <div className="relative z-10 grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-[#e8d6a8]">
              <Moon className="h-4 w-4" /> مساحة خاصة لك
            </p>
            <h1 className="font-naskh text-4xl font-bold leading-[1.55] sm:text-5xl">خلوة مع الله، ووقت للقلب</h1>
            <p className="mt-3 max-w-xl text-sm leading-8 text-[#e2e9df] sm:text-base">
              القرآن والذكر والدعاء والتدبّر في رحلة هادئة. أنت من يحدد الوقت والخطوات، ولا توجد نقاط أو تقييم للخشوع أو التوبة.
            </p>
          </div>
          <div className="flex items-center gap-4 rounded-3xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-sm">
            <div className="grid h-16 w-16 place-items-center rounded-full border-4 border-[#d7bc7c] text-2xl font-bold">{doneCount}<span className="text-xs">/٧</span></div>
            <div><p className="text-sm text-[#e2e9df]">خطوات اليوم</p><p className="font-bold">{session?.finishedAt ? "أتممت جلستك" : done ? "جاهز للختام" : "على مهل"}</p></div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-bold"><Clock3 className="h-4 w-4 text-accent" /> مدة الجلسة المقترحة</div>
        <div className="flex flex-wrap gap-2" aria-label="مدة الخلوة">
          {DURATIONS.map((d) => <button key={d} type="button" aria-pressed={duration === d} onClick={() => chooseDuration(d)} className={`rounded-full px-4 py-1.5 text-sm font-bold focus-ring ${duration === d ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted"}`}>{d} دقيقة</button>)}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.4fr] lg:items-start">
        <section aria-label="مراحل الخلوة" className="rounded-[1.75rem] border border-line bg-surface p-3 sm:p-4">
          <div className="px-2 pb-4 pt-2"><h2 className="text-lg font-bold">رحلتك الهادئة</h2><p className="text-sm text-muted">اختر أي خطوة، ويمكنك العودة إليها متى شئت.</p></div>
          <div className="space-y-1.5">
            {STAGES.map((s, i) => {
              const Icon = s.icon;
              const selected = active === s.id;
              const checked = completed.includes(s.id);
              return (
                <button key={s.id} type="button" aria-pressed={selected} onClick={() => chooseStage(s.id)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-right transition-colors focus-ring ${selected ? "bg-accent-soft ring-1 ring-accent/30" : "hover:bg-surface-2"}`}>
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${checked ? "bg-primary text-primary-fg" : selected ? "bg-surface text-accent" : "bg-surface-2 text-muted"}`}>{checked ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}</span>
                  <span className="min-w-0 flex-1"><span className="block font-bold">{s.title}</span><span className="text-xs text-muted">{s.subtitle}</span></span>
                  <span className="text-xs tabular-nums text-muted">{Math.max(1, Math.round(s.duration * duration / 20))} د</span>
                  <span className="sr-only">الخطوة {i + 1}</span>
                </button>
              );
            })}
          </div>
          <ProgressBar className="mt-5 h-2" value={hydrated ? doneCount / STAGES.length : 0} label="مراحل الخلوة المكتملة" />
        </section>

        <section className="rounded-[1.75rem] border border-line bg-surface p-5 sm:p-8">
          <div className="mb-5 flex items-center justify-between gap-2"><span className="rounded-full bg-gold-soft px-3 py-1 text-xs font-bold text-gold-fg">مساحة للتأمل</span><span className="text-sm text-muted">{STAGES.findIndex((s) => s.id === active) + 1} من ٧</span></div>
          <h2 className="font-naskh text-3xl font-bold leading-relaxed">{stage.title}</h2>
          <p className="mt-3 min-h-24 text-[15px] leading-8 text-muted">{stage.prompt}</p>
          {stage.href && <Link href={stage.href} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-4 py-2 text-sm font-bold text-primary focus-ring">{stage.linkLabel}<ChevronLeft className="h-4 w-4" /></Link>}
          <div className="khalwa-timer mt-8 flex flex-col items-center rounded-[1.5rem] px-5 py-7 text-center">
            <p className="text-sm font-semibold text-muted">مؤقّت اختياري للتركيز</p>
            <time className="mt-2 text-6xl font-bold tabular-nums tracking-tight text-primary" dir="ltr" aria-label={`${Math.floor(seconds / 60)} دقيقة و${seconds % 60} ثانية`}>{formatTime(seconds)}</time>
            <div className="mt-5 flex gap-2">
              <Button onClick={() => { if (seconds === 0) setSeconds(Math.max(60, Math.round(stage.duration * duration / 20 * 60))); setRunning(!running); }}>
                {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{running ? "إيقاف مؤقت" : "ابدأ التركيز"}
              </Button>
              <Button variant="outline" size="icon" aria-label="إعادة المؤقّت" onClick={() => { setRunning(false); setSeconds(Math.max(60, Math.round(stage.duration * duration / 20 * 60))); }}><RotateCcw className="h-4 w-4" /></Button>
            </div>
            <p className="mt-3 text-xs text-muted">انتهاء المؤقّت لا يعني تلقائيًا اكتمال العبادة.</p>
          </div>
          <Button className="mt-6 w-full" variant={completed.includes(active) ? "outline" : "gold"} onClick={mark}>
            <Check className="h-4 w-4" />{completed.includes(active) ? "إلغاء علامة الإنجاز" : "أنجزتُ هذه الخطوة"}
          </Button>
          <p className="mt-3 text-center text-xs text-muted">يمكنك تسجيل إتمام الخطوة دون استخدام المؤقّت.</p>
        </section>
      </div>

      <section className="rounded-[1.75rem] border border-line bg-surface p-5 sm:p-7">
        <div className="mb-3 flex items-center gap-2"><Leaf className="h-5 w-5 text-accent" /><h2 className="text-lg font-bold">خاطرة خاصة لنفسك</h2></div>
        <p className="mb-3 text-sm text-muted">اكتب خطوة عملية أو معنى تريد تذكره. لا تكتب تفاصيل توبتك أو أسرارك إن لم ترغب.</p>
        <textarea value={note} onChange={(e) => saveKhalwaReflection(e.target.value, date)} rows={3} maxLength={1200} placeholder="ما الخطوة الصغيرة التي أريد الاستمرار عليها؟" className="w-full rounded-2xl border border-line bg-bg p-4 text-sm leading-7 outline-none focus:border-accent" />
        <p className="mt-3 text-xs text-muted">تُحفظ تلقائيًا على جهازك، ولا تظهر في «خليلي».</p>
      </section>

      <div className="rounded-[1.5rem] bg-accent-soft p-5 text-center">
        <p className="font-naskh text-2xl font-bold">تقبّل الله منك</p>
        <p className="mt-1 text-sm text-muted">كل خطوة اختيارية، ولا تُقاس قيمة العبادة بعدّاد.</p>
        <Button className="mt-4" disabled={!done || !!session?.finishedAt} onClick={() => { finishKhalwa(date); toast("حُفظ ختام جلسة اليوم"); }}>{session?.finishedAt ? "خلوة اليوم مكتملة ✓" : "ختام الخلوة"}</Button>
      </div>
    </div>
  );
}
