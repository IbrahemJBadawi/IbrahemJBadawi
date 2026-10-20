"use client";

import { ArrowLeft, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OasisScene } from "@/components/OasisScene";
import { LocationPicker } from "@/components/prayer/LocationPicker";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { setDevice, useDevice } from "@/lib/device";
import { addTask, updateSettings } from "@/lib/store/actions";
import { TASK_CATALOG } from "@/lib/tasks";

const GOALS = [
  { v: 0, label: "بدون هدف الآن", hint: "أقرأ بحرية" },
  { v: 1, label: "صفحة واحدة", hint: "نحو ٣ دقائق" },
  { v: 2, label: "صفحتان", hint: "ختمة كل ١٠ أشهر تقريبًا" },
  { v: 5, label: "٥ صفحات", hint: "ختمة كل ٤ أشهر تقريبًا" },
  { v: 20, label: "جزء كامل", hint: "ختمة كل شهر" },
];

export function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState(2);
  const [tasks, setTasks] = useState<string[]>(TASK_CATALOG.filter((t) => t.recommended).map((t) => t.type));
  const hasLocation = useDevice((s) => !!s.location);
  const steps = 4;

  const finish = () => {
    updateSettings({ dailyGoal: { enabled: goal > 0, unit: "pages", amount: goal || 2 } });
    for (const t of TASK_CATALOG) if (tasks.includes(t.type)) addTask(t.type, t.title);
    setDevice({ onboarded: true });
    router.replace("/today");
  };

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col">
      <div className="mb-6 flex items-center gap-1.5" aria-label={`الخطوة ${step + 1} من ${steps}`}>
        {Array.from({ length: steps }, (_, i) => (
          <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-line")} />
        ))}
      </div>

      <div key={step} className="animate-rise flex-1">
        {step === 0 && (
          <div className="text-center">
            <OasisScene className="mx-auto w-64" />
            <h1 className="mt-4 text-3xl font-bold">أهلًا بك في واحتك</h1>
            <p className="mt-3 leading-relaxed text-muted">
              مكان هادئ لوردك اليومي: المصحف، والأذكار، والصلاة، والتدبّر. لا تحتاج إلى حساب — كل شيء يُحفظ على جهازك.
            </p>
          </div>
        )}
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-bold">ما وردك اليومي المريح؟</h1>
            <p className="mt-1 text-muted">ابدأ بالقليل الدائم؛ يمكنك تغييره متى شئت.</p>
            <div className="mt-5 space-y-2" role="radiogroup" aria-label="الهدف اليومي">
              {GOALS.map((g) => (
                <button
                  key={g.v}
                  type="button"
                  role="radio"
                  aria-checked={goal === g.v}
                  onClick={() => setGoal(g.v)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl border-2 px-4 py-3.5 text-right focus-ring",
                    goal === g.v ? "border-primary bg-accent-soft" : "border-line bg-surface",
                  )}
                >
                  <span>
                    <span className="block font-bold">{g.label}</span>
                    <span className="block text-sm text-muted">{g.hint}</span>
                  </span>
                  {goal === g.v && <Check className="h-5 w-5 text-primary" aria-hidden="true" />}
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 2 && (
          <div>
            <h1 className="text-2xl font-bold">ماذا تريد أن تتابع يوميًا؟</h1>
            <p className="mt-1 text-muted">ستظهر في «خطة اليوم»، وتكتمل تلقائيًا عند إنجازها.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {TASK_CATALOG.map((t) => {
                const on = tasks.includes(t.type);
                return (
                  <button
                    key={t.type}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setTasks(on ? tasks.filter((x) => x !== t.type) : [...tasks, t.type])}
                    className={cn("rounded-2xl border-2 px-3 py-3 text-right text-sm font-semibold focus-ring", on ? "border-primary bg-accent-soft" : "border-line bg-surface")}
                  >
                    {on ? "✓ " : ""}
                    {t.title}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {step === 3 && (
          <div>
            <h1 className="text-2xl font-bold">مواقيت الصلاة والقبلة</h1>
            <p className="mt-1 text-muted">اختياري — يمكنك تخطّيه الآن.</p>
            <div className="mt-5">{hasLocation ? <p className="rounded-2xl bg-accent-soft p-4 font-semibold text-success">✓ حُدّد موقعك بنجاح</p> : <LocationPicker />}</div>
          </div>
        )}
      </div>

      <div className="sticky bottom-24 mt-8 flex items-center justify-between gap-3 bg-bg py-3 lg:bottom-0">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => setStep(step - 1)}>
            السابق
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => { setDevice({ onboarded: true }); router.replace("/today"); }}>
            تخطٍّ
          </Button>
        )}
        {step < steps - 1 ? (
          <Button onClick={() => setStep(step + 1)} size="lg">
            التالي
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
        ) : (
          <Button onClick={finish} size="lg">
            ابدأ رحلتك
          </Button>
        )}
      </div>
    </div>
  );
}
