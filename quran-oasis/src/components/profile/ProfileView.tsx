"use client";

import { Bell, CloudOff, Database, Download, LogOut, Palette, Shield, Upload, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { QuranPassage } from "@/components/quran/QuranPassage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Card, CardTitle } from "@/components/ui/Card";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { Field, Input, Segmented, Switch } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";
import { emptyState } from "@/lib/store/defaults";
import { formatShortDate } from "@/lib/date";
import { resetDevice } from "@/lib/device";
import { mergeStates } from "@/lib/store/merge";
import { buildBackup, clearLocalBackups, importBackup, parseBackup, requestPersistentStorage, restoreSnapshot, useLocalStorageInfo } from "@/lib/store/persist";
import { SYNC_SLICES } from "@/lib/store/types";
import { updateSettings } from "@/lib/store/actions";
import { replaceState, useHydrated, useStore } from "@/lib/store/store";
import { stopSync, useSyncInfo } from "@/lib/store/sync";
import type { ThemePref } from "@/lib/store/types";
import { getSupabase } from "@/lib/supabase/client";
import { OfflineManager } from "./OfflineManager";

const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function AccountSection() {
  const { enabled, user, profile, loading, signOut, refreshProfile } = useAuth();
  const sync = useSyncInfo();
  const toast = useToast();
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => setName(profile?.display_name ?? ""), [profile?.display_name]);

  if (!enabled) {
    return (
      <p className="text-sm text-muted">
        تعمل المنصة حاليًا بوضع الزائر: يُحفظ تقدمك على هذا الجهاز فقط. (خدمة الحسابات غير مفعّلة في هذه النسخة.)
      </p>
    );
  }
  if (loading) return <div className="h-20 animate-pulse rounded-2xl bg-surface-2" />;
  if (!user) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">أنت تستخدم المنصة كزائر. يُحفظ تقدمك على هذا الجهاز فقط، وقد يضيع إذا مُسحت بيانات المتصفح.</p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/signup">إنشاء حساب مجاني</ButtonLink>
          <ButtonLink href="/login" variant="outline">
            تسجيل الدخول
          </ButtonLink>
        </div>
      </div>
    );
  }

  const syncLabel = {
    disabled: "غير مفعّلة",
    idle: "متزامن",
    syncing: "جارٍ المزامنة…",
    offline: "بانتظار الاتصال",
    error: "تعذّرت المزامنة، سنعيد المحاولة",
  }[sync.status];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold" dir="ltr">
          {user.email}
        </span>
        {profile?.role && profile.role !== "user" && <Badge tone="gold">{profile.role === "admin" ? "مدير" : "محرر"}</Badge>}
        <Badge tone={sync.status === "error" ? "danger" : sync.status === "idle" ? "success" : "neutral"}>المزامنة: {syncLabel}</Badge>
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const v = name.trim();
          if (v.length < 2 || v.length > 80) return toast("الاسم بين 2 و80 حرفًا", "error");
          setSaving(true);
          const { error } = await getSupabase()!.from("profiles").update({ display_name: v }).eq("id", user.id);
          setSaving(false);
          if (error) return toast("تعذّر حفظ الاسم", "error");
          await refreshProfile();
          toast("حُفظ الاسم");
        }}
      >
        <div className="min-w-56 flex-1">
          <Field label="الاسم">{(id) => <Input id={id} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />}</Field>
        </div>
        <Button type="submit" variant="secondary" disabled={saving || name.trim() === (profile?.display_name ?? "")}>
          حفظ
        </Button>
      </form>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={async () => {
            await signOut();
            toast("سُجّل خروجك. حُذفت بياناتك المحلية من هذا الجهاز، وهي محفوظة في حسابك.");
            router.replace("/");
          }}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          تسجيل الخروج
        </Button>
        <Link href="/auth/update-password" className="inline-flex h-11 items-center rounded-full px-4 text-sm font-semibold text-muted hover:bg-surface-2 focus-ring">
          تغيير كلمة المرور
        </Link>
        <Button variant="ghost" className="text-danger" onClick={() => setDeleteOpen(true)}>
          حذف الحساب
        </Button>
      </div>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title="حذف الحساب نهائيًا">
        <div className="space-y-3 text-sm">
          <p className="text-muted">
            سيُحذف حسابك وجميع بياناتك المخزنة لدينا نهائيًا: التقدم، والمفضلة، والخطط، والحفظ، والخواطر. لا يمكن التراجع عن هذا الإجراء.
          </p>
          <p className="text-muted">ننصحك بتصدير بياناتك أولًا من قسم «بياناتي».</p>
          <Field label="اكتب كلمة «حذف» للتأكيد">{(id) => <Input id={id} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />}</Field>
          {deleteError && <p role="alert" className="text-danger">{deleteError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              إلغاء
            </Button>
            <Button
              variant="danger"
              disabled={confirmText.trim() !== "حذف" || deleting}
              onClick={async () => {
                setDeleting(true);
                setDeleteError(null);
                const { error } = await getSupabase()!.rpc("delete_my_account");
                setDeleting(false);
                if (error) return setDeleteError(error.message.includes("آخر مدير") ? error.message : "تعذّر حذف الحساب. حاول لاحقًا.");
                await stopSync({ clearLocal: true });
                await getSupabase()!.auth.signOut();
                router.replace("/");
              }}
            >
              {deleting ? "جارٍ الحذف…" : "حذف حسابي نهائيًا"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function RemindersSection() {
  const r = useStore((s) => s.settings.reminders);
  const toast = useToast();
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  useEffect(() => setPerm("Notification" in window ? Notification.permission : "unsupported"), []);
  const set = (patch: Partial<typeof r>) => updateSettings({ reminders: { ...r, ...patch } });

  return (
    <div className="space-y-3">
      <Switch
        checked={r.enabled}
        onChange={(v) => {
          set({ enabled: v, ...(v && !r.morning && !r.evening && !r.reading ? { morning: "06:30", evening: "17:30" } : {}) });
          toast(v ? "فُعّلت التذكيرات" : "أُوقفت التذكيرات");
        }}
        label="تفعيل التذكيرات"
        description="تذكيرات لطيفة مرة واحدة في اليوم لكل نوع، ولا تظهر إن أنجزت العمل."
      />
      {r.enabled && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ["morning", "أذكار الصباح"],
                ["evening", "أذكار المساء"],
                ["reading", "الورد اليومي"],
              ] as const
            ).map(([k, label]) => (
              <Field key={k} label={label} hint={r[k] ? undefined : "غير مفعّل"}>
                {(id, d) => (
                  <div className="flex gap-1">
                    <Input id={id} aria-describedby={d} type="time" value={r[k] ?? ""} onChange={(e) => set({ [k]: e.target.value || null })} />
                    {r[k] && (
                      <button type="button" onClick={() => set({ [k]: null })} className="rounded-xl px-2 text-xs text-muted hover:bg-surface-2 focus-ring" aria-label={`إلغاء تذكير ${label}`}>
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </Field>
            ))}
          </div>
          <div>
            <p className="mb-1.5 text-sm font-semibold">الأيام</p>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d, i) => {
                const on = r.days.includes(i);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set({ days: on ? r.days.filter((x) => x !== i) : [...r.days, i].sort() })}
                    className={`h-9 rounded-full px-3 text-sm font-semibold focus-ring ${on ? "bg-primary text-primary-fg" : "bg-surface-2"}`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="rounded-xl bg-surface-2 p-3 text-xs leading-relaxed text-muted">
            تظهر التذكيرات أثناء فتح المنصة على جهازك (أو عند فتح التطبيق المثبّت). لا نرسل إشعارات من خوادمنا.
            {perm === "default" && (
              <button
                type="button"
                className="mr-1 font-semibold text-accent underline"
                onClick={async () => {
                  const p = await Notification.requestPermission();
                  setPerm(p);
                }}
              >
                السماح بإشعارات النظام (اختياري)
              </button>
            )}
            {perm === "denied" && " إشعارات النظام محظورة في المتصفح؛ ستظهر التذكيرات داخل الصفحة فقط."}
          </div>
        </>
      )}
    </div>
  );
}

function DataSection() {
  const { user } = useAuth();
  const toast = useToast();
  const info = useLocalStorageInfo();
  const [confirm, setConfirm] = useState(false);
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const [restoreDay, setRestoreDay] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportFile = () => {
    const blob = new Blob([JSON.stringify(buildBackup(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `quran-oasis-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-surface-2 p-3">
          <p className="text-xs text-muted">مكان الحفظ</p>
          <p className="font-bold">{user ? "جهازك + حسابك" : "على هذا الجهاز"}</p>
          <p className="text-xs text-muted">{info.idb ? "مع نسخة احتياطية تلقائية داخل المتصفح" : "التخزين السريع للمتصفح"}</p>
        </div>
        <div className="rounded-2xl bg-surface-2 p-3">
          <p className="text-xs text-muted">آخر حفظ احتياطي</p>
          <p className="font-bold">{info.lastMirror ? new Date(info.lastMirror).toLocaleTimeString("ar", { hour: "numeric", minute: "2-digit" }) : "—"}</p>
          <p className="text-xs text-muted">{info.usageKb != null ? `المساحة المستخدمة: ${info.usageKb.toLocaleString("ar")} ك.ب` : ""}</p>
        </div>
        <div className="rounded-2xl bg-surface-2 p-3">
          <p className="text-xs text-muted">الحفظ الدائم</p>
          <p className="font-bold">{info.persisted ? "مفعّل ✓" : info.persisted === false ? "غير مفعّل" : "غير معروف"}</p>
          {info.persisted === false && (
            <button
              type="button"
              className="text-xs font-semibold text-accent underline"
              onClick={async () => toast((await requestPersistentStorage()) ? "سيحافظ المتصفح على بياناتك" : "لم يوافق المتصفح حاليًا؛ ثبّت التطبيق على الشاشة الرئيسية لزيادة الفرصة", "info")}
            >
              اطلب من المتصفح عدم حذفها
            </button>
          )}
        </div>
      </div>
      {info.restoredFromBackup && (
        <p role="status" className="rounded-xl bg-accent-soft p-3 text-sm text-success">
          استُعيدت بياناتك تلقائيًا من النسخة الاحتياطية المحلية بعد أن مُسح التخزين السريع للمتصفح.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={exportFile}>
          <Download className="h-4 w-4" aria-hidden="true" />
          تصدير نسخة احتياطية
        </Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" aria-hidden="true" />
          استيراد نسخة
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="ملف النسخة الاحتياطية"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setImportError(null);
            const text = await f.text();
            try {
              parseBackup(text);
              setPendingImport(text);
            } catch (err) {
              setImportError((err as Error).message);
            }
          }}
        />
        {!user && (
          <Button variant="ghost" className="text-danger" onClick={() => setConfirm(true)}>
            مسح البيانات المحلية
          </Button>
        )}
      </div>
      {importError && (
        <p role="alert" className="text-sm text-danger">
          {importError}
        </p>
      )}

      {info.snapshots.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold">نسخ تلقائية يومية (آخر ٧ أيام)</p>
          <ul className="flex flex-wrap gap-2">
            {info.snapshots.map((sn) => (
              <li key={sn.day}>
                <button type="button" onClick={() => setRestoreDay(sn.day)} className="rounded-full bg-surface-2 px-3 py-1.5 text-sm font-semibold hover:bg-accent-soft focus-ring">
                  {formatShortDate(sn.day)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dialog open={!!pendingImport} onClose={() => setPendingImport(null)} title="استيراد نسخة احتياطية">
        <p className="text-sm text-muted">كيف تريد استيراد البيانات؟</p>
        <div className="mt-4 grid gap-2">
          <Button
            onClick={() => {
              importBackup(pendingImport!, "merge", (a, b) => mergeStates(a, b, SYNC_SLICES));
              setPendingImport(null);
              toast("دُمجت النسخة مع بياناتك الحالية");
            }}
          >
            دمج مع بياناتي الحالية (موصى به)
          </Button>
          <Button
            variant="outline"
            className="text-danger"
            onClick={() => {
              importBackup(pendingImport!, "replace");
              setPendingImport(null);
              toast("استُبدلت بياناتك بالنسخة المستوردة");
            }}
          >
            استبدال بياناتي الحالية بالكامل
          </Button>
        </div>
      </Dialog>
      <ConfirmDialog
        open={!!restoreDay}
        title="استعادة نسخة تلقائية"
        message={restoreDay ? `ستُستبدل بياناتك الحالية بنسخة يوم ${formatShortDate(restoreDay)}. ننصح بتصدير نسخة من بياناتك الحالية أولًا.` : ""}
        confirmLabel="استعادة"
        onClose={() => setRestoreDay(null)}
        onConfirm={async () => {
          if (restoreDay && (await restoreSnapshot(restoreDay))) toast("استُعيدت النسخة");
        }}
      />
      <ConfirmDialog
        open={confirm}
        danger
        title="مسح البيانات المحلية"
        message="سيُحذف كل تقدمك المحفوظ على هذا الجهاز (القراءة، الأذكار، المفضلة، الخطط، الحفظ، الخواطر) مع النسخ الاحتياطية المحلية. لا يمكن التراجع."
        confirmLabel="مسح"
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          replaceState(emptyState());
          await clearLocalBackups();
          resetDevice();
          toast("مُسحت البيانات المحلية");
        }}
      />
    </div>
  );
}

export function ProfileView() {
  const hydrated = useHydrated();
  const { profile } = useAuth();
  const settings = useStore((s) => s.settings);
  if (!hydrated) return <div className="h-96 animate-pulse rounded-[var(--radius-card)] bg-surface-2" />;
  const staff = profile?.role === "admin" || profile?.role === "editor";

  return (
    <div className="mx-auto grid max-w-4xl gap-5">
      <Card>
        <CardTitle icon={<UserRound className="h-5 w-5" />}>الحساب</CardTitle>
        <AccountSection />
        {staff && (
          <Link href="/admin" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent focus-ring rounded">
            <Shield className="h-4 w-4" aria-hidden="true" />
            لوحة الإدارة
          </Link>
        )}
      </Card>

      <Card>
        <CardTitle icon={<Palette className="h-5 w-5" />}>العرض</CardTitle>
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-semibold">المظهر</p>
            <Segmented<ThemePref>
              label="المظهر"
              value={settings.theme}
              onChange={(theme) => updateSettings({ theme })}
              options={[
                { value: "system", label: "حسب الجهاز" },
                { value: "light", label: "فاتح" },
                { value: "dark", label: "داكن" },
              ]}
            />
          </div>
          <div>
            <label htmlFor="font-scale" className="mb-2 block text-sm font-semibold">
              حجم خط المصحف والأذكار: {Math.round(settings.fontScale * 100)}٪
            </label>
            <input
              id="font-scale"
              type="range"
              min={0.8}
              max={1.8}
              step={0.1}
              value={settings.fontScale}
              onChange={(e) => updateSettings({ fontScale: Number(e.target.value) })}
              className="w-full accent-[var(--accent)]"
            />
            <div className="mt-3 rounded-2xl bg-surface-2 p-4">
              <QuranPassage refs={[{ surah: 1, from: 2, to: 2 }]} />
            </div>
          </div>
          <Switch
            checked={settings.focusMode}
            onChange={(focusMode) => updateSettings({ focusMode })}
            label="وضع التركيز في القارئ"
            description="يخفي القوائم أثناء قراءة المصحف"
          />
        </div>
      </Card>

      <Card id="reminders">
        <CardTitle icon={<Bell className="h-5 w-5" />}>التذكيرات</CardTitle>
        <RemindersSection />
      </Card>

      <Card>
        <CardTitle icon={<CloudOff className="h-5 w-5" />}>القراءة دون اتصال</CardTitle>
        <OfflineManager />
      </Card>

      <Card>
        <CardTitle icon={<Database className="h-5 w-5" />}>بياناتي</CardTitle>
        <DataSection />
      </Card>

      <p className="text-center text-sm text-muted">
        <Link href="/privacy" className="underline">
          سياسة الخصوصية
        </Link>{" "}
        ·{" "}
        <Link href="/terms" className="underline">
          شروط الاستخدام
        </Link>{" "}
        ·{" "}
        <Link href="/sources" className="underline">
          مصادر المحتوى
        </Link>
      </p>
    </div>
  );
}
