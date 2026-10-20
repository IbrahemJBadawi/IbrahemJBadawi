"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";
import { safeNext } from "@/lib/safe-redirect";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "./AuthProvider";
import { AuthCard, translateAuthError } from "./AuthCard";

const email = z.string().trim().email("أدخل بريدًا إلكترونيًا صحيحًا").max(254);
const password = z
  .string()
  .min(8, "كلمة المرور 8 أحرف على الأقل")
  .max(72, "كلمة المرور طويلة جدًا")
  .regex(/[A-Za-z؀-ۿ]/, "يجب أن تحتوي على حرف واحد على الأقل")
  .regex(/\d/, "يجب أن تحتوي على رقم واحد على الأقل");

function Alert({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={tone === "error" ? "rounded-xl bg-danger/10 p-3 text-sm text-danger" : "rounded-xl bg-accent-soft p-3 text-sm text-success"}>
      {children}
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [next, setNext] = useState("/today");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setNext(safeNext(p.get("next")));
    if (p.get("error") === "link") setError("انتهت صلاحية الرابط أو أنه غير صالح. اطلب رابطًا جديدًا.");
  }, []);
  useEffect(() => {
    if (user) router.replace(next);
  }, [user, next, router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = email.safeParse(form.email);
    if (!parsed.success || !form.password) return setError("أدخل البريد الإلكتروني وكلمة المرور.");
    setBusy(true);
    const { error: err } = await getSupabase()!.auth.signInWithPassword({ email: parsed.data, password: form.password });
    setBusy(false);
    if (err) return setError(translateAuthError(err.message));
    router.replace(next);
  };

  return (
    <AuthCard
      title="تسجيل الدخول"
      subtitle="لمزامنة تقدمك بين أجهزتك"
      footer={
        <>
          ليس لديك حساب؟{" "}
          <Link href="/signup" className="font-semibold text-accent underline">
            أنشئ حسابًا
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="البريد الإلكتروني">
          {(id) => <Input id={id} type="email" autoComplete="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />}
        </Field>
        <Field label="كلمة المرور">
          {(id) => (
            <Input id={id} type="password" autoComplete="current-password" dir="ltr" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          )}
        </Field>
        <div className="text-left">
          <Link href="/forgot-password" className="text-sm font-semibold text-accent">
            نسيت كلمة المرور؟
          </Link>
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "جارٍ الدخول…" : "دخول"}
        </Button>
      </form>
    </AuthCard>
  );
}

export function SignupForm() {
  const [form, setForm] = useState({ name: "", email: "", password: "", agree: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const schema = z.object({
      name: z.string().trim().min(2, "الاسم حرفان على الأقل").max(80),
      email,
      password,
      agree: z.literal(true, { message: "يجب الموافقة على الشروط وسياسة الخصوصية" }),
    });
    const r = schema.safeParse(form);
    if (!r.success) {
      const errs: Record<string, string> = {};
      for (const issue of r.error.issues) errs[String(issue.path[0])] ??= issue.message;
      return setErrors(errs);
    }
    setErrors({});
    setBusy(true);
    const { data, error: err } = await getSupabase()!.auth.signUp({
      email: r.data.email,
      password: r.data.password,
      options: {
        data: { display_name: r.data.name },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/today`,
      },
    });
    setBusy(false);
    if (err) return setError(translateAuthError(err.message));
    // Supabase لا يكشف إن كان البريد مسجلًا مسبقًا (حماية من تعداد الحسابات)
    if (data.user && !data.session) setDone(true);
  };

  if (done) {
    return (
      <AuthCard title="تحقق من بريدك" subtitle="خطوة أخيرة">
        <Alert tone="success">
          أرسلنا رابط تأكيد إلى <strong dir="ltr">{form.email}</strong>. افتح الرابط لتفعيل حسابك، ثم سجّل الدخول.
        </Alert>
        <p className="mt-4 text-sm text-muted">لم تصلك الرسالة؟ تحقق من مجلد الرسائل غير المرغوب فيها.</p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="إنشاء حساب"
      subtitle="مجاني، ويمكنك حذفه في أي وقت"
      footer={
        <>
          لديك حساب؟{" "}
          <Link href="/login" className="font-semibold text-accent underline">
            سجّل الدخول
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="الاسم" error={errors.name}>
          {(id, d) => <Input id={id} aria-describedby={d} autoComplete="name" value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
        </Field>
        <Field label="البريد الإلكتروني" error={errors.email}>
          {(id, d) => <Input id={id} aria-describedby={d} type="email" dir="ltr" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}
        </Field>
        <Field label="كلمة المرور" hint="8 أحرف على الأقل، تتضمن حرفًا ورقمًا" error={errors.password}>
          {(id, d) => (
            <Input id={id} aria-describedby={d} type="password" dir="ltr" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          )}
        </Field>
        <div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={form.agree} onChange={(e) => setForm({ ...form, agree: e.target.checked })} className="mt-1 h-4 w-4 accent-[var(--accent)]" />
            <span>
              أوافق على{" "}
              <Link href="/terms" className="text-accent underline" target="_blank">
                شروط الاستخدام
              </Link>{" "}
              و
              <Link href="/privacy" className="text-accent underline" target="_blank">
                سياسة الخصوصية
              </Link>
            </span>
          </label>
          {errors.agree && <p className="mt-1 text-xs text-danger">{errors.agree}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "جارٍ الإنشاء…" : "إنشاء الحساب"}
        </Button>
        <p className="text-xs text-muted">تقدّمك المحفوظ على هذا الجهاز سيُنقل إلى حسابك تلقائيًا بعد تسجيل الدخول.</p>
      </form>
    </AuthCard>
  );
}

export function ForgotForm() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const r = email.safeParse(value);
    if (!r.success) return setError(r.error.issues[0].message);
    setBusy(true);
    const { error: err } = await getSupabase()!.auth.resetPasswordForEmail(r.data, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    });
    setBusy(false);
    if (err) return setError(translateAuthError(err.message));
    setSent(true);
  };
  return (
    <AuthCard title="استعادة كلمة المرور" subtitle="سنرسل لك رابطًا لتعيين كلمة مرور جديدة" footer={<Link href="/login" className="font-semibold text-accent underline">العودة لتسجيل الدخول</Link>}>
      {sent ? (
        <Alert tone="success">إن كان البريد مسجّلًا لدينا، فستصلك رسالة تحتوي على رابط الاستعادة خلال دقائق.</Alert>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error && <Alert tone="error">{error}</Alert>}
          <Field label="البريد الإلكتروني">
            {(id) => <Input id={id} type="email" dir="ltr" autoComplete="email" value={value} onChange={(e) => setValue(e.target.value)} />}
          </Field>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "جارٍ الإرسال…" : "إرسال رابط الاستعادة"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}

export function UpdatePasswordForm() {
  const router = useRouter();
  const toast = useToast();
  const { user, loading } = useAuth();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const r = password.safeParse(value);
    if (!r.success) return setError(r.error.issues[0].message);
    setBusy(true);
    const { error: err } = await getSupabase()!.auth.updateUser({ password: r.data });
    setBusy(false);
    if (err) return setError(translateAuthError(err.message));
    toast("تم تحديث كلمة المرور");
    router.replace("/today");
  };
  return (
    <AuthCard title="كلمة مرور جديدة">
      {!loading && !user ? (
        <Alert tone="error">
          الرابط غير صالح أو انتهت صلاحيته.{" "}
          <Link href="/forgot-password" className="font-bold underline">
            اطلب رابطًا جديدًا
          </Link>
        </Alert>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error && <Alert tone="error">{error}</Alert>}
          <Field label="كلمة المرور الجديدة" hint="8 أحرف على الأقل، تتضمن حرفًا ورقمًا">
            {(id, d) => <Input id={id} aria-describedby={d} type="password" dir="ltr" autoComplete="new-password" value={value} onChange={(e) => setValue(e.target.value)} />}
          </Field>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "جارٍ الحفظ…" : "حفظ كلمة المرور"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
