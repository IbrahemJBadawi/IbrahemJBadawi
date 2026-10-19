"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { submitContact, type ContactState } from "@/app/[lang]/contact/actions";
import { Icon, type IconName } from "@/components/Icon";
import { CONTACT } from "@/config/company";
import { href } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import { BUDGETS, LIMITS, REQUEST_TYPES, hasErrors, normalize, validate, type ContactErrors, type ContactField, type FieldError } from "@/lib/contact/validate";
import { STORAGE_KEYS, readStorage, writeStorage } from "@/lib/storage";

type Draft = { name: string; email: string; organization: string; type: string; budget: string; message: string };
const EMPTY: Draft = { name: "", email: "", organization: "", type: "", budget: "", message: "" };

const TYPE_ICONS: Record<(typeof REQUEST_TYPES)[number], IconName> = {
  service: "briefcase",
  venture: "layers",
  partnership: "users",
  education: "cap",
  media: "globe",
  other: "chat",
};

/**
 * The contact form. Validates in the browser for instant feedback (the
 * server validates again), keeps an unsent draft on this device, and says
 * "sent" only when the server confirms delivery.
 */
export function ContactForm({ initialType, topic, topicLabel }: { initialType?: string; topic?: string; topicLabel?: string }) {
  const t = useT();
  const locale = useLocale();
  const [state, action, pending] = useActionState<ContactState, FormData>(submitContact, { status: "idle" });
  const [draft, setDraft] = useState<Draft>(() => ({ ...EMPTY, type: initialType ?? "" }));
  const [restored, setRestored] = useState(false);
  const [consent, setConsent] = useState(false);
  const [clientErrors, setClientErrors] = useState<ContactErrors>({});
  const [startedAt] = useState(() => Date.now());
  const resultRef = useRef<HTMLDivElement>(null);

  // Restore an unsent draft once, after hydration.
  useEffect(() => {
    const saved = readStorage<Draft | null>(STORAGE_KEYS.contactDraft, null);
    if (saved && (saved.name || saved.message || saved.email)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading device storage is only possible after mount
      setDraft({ ...EMPTY, ...saved, type: initialType || saved.type });
      setRestored(true);
    }
  }, [initialType]);

  // Save while typing (never the consent box).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (draft.name || draft.email || draft.message || draft.organization) writeStorage(STORAGE_KEYS.contactDraft, draft);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draft]);

  useEffect(() => {
    if (state.status === "sent") {
      writeStorage(STORAGE_KEYS.contactDraft, null);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the form after a confirmed send
      setDraft({ ...EMPTY });
      setConsent(false);
      setRestored(false);
    }
    if (state.status !== "idle") resultRef.current?.focus();
  }, [state]);

  const errors: ContactErrors = { ...(state.status === "invalid" ? state.errors : {}), ...clientErrors };

  function update(field: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    if (clientErrors[field as ContactField]) setClientErrors((current) => ({ ...current, [field]: undefined }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const found = validate(normalize({ ...draft, topic: topic ?? "", consent }));
    const clean = Object.fromEntries(Object.entries(found).filter(([, value]) => value)) as ContactErrors;
    setClientErrors(clean);
    if (hasErrors(clean)) {
      event.preventDefault();
      const first = Object.keys(clean)[0];
      document.getElementById(`f-${first}`)?.focus();
    }
  }

  function discardDraft() {
    writeStorage(STORAGE_KEYS.contactDraft, null);
    setDraft({ ...EMPTY, type: initialType ?? "" });
    setRestored(false);
  }

  function message(field: ContactField, error?: FieldError) {
    if (!error) return null;
    const texts: Record<FieldError, string> = {
      required:
        field === "consent"
          ? t("يلزم الموافقة على سياسة الخصوصية لإرسال الطلب.", "Please accept the privacy policy to send your request.")
          : field === "type"
            ? t("اختر نوع الطلب.", "Choose a request type.")
            : t("هذا الحقل مطلوب.", "This field is required."),
      too_short:
        field === "message"
          ? t(`اكتب ${LIMITS.messageMin} حرفًا على الأقل حتى نفهم طلبك.`, `Write at least ${LIMITS.messageMin} characters so we understand your request.`)
          : t("القيمة قصيرة جدًا.", "Too short."),
      too_long: t("النص أطول من المسموح.", "This is longer than allowed."),
      invalid: field === "email" ? t("اكتب بريدًا إلكترونيًا صحيحًا، مثل name@example.com.", "Enter a valid email, like name@example.com.") : t("قيمة غير صالحة.", "Invalid value."),
    };
    return (
      <p className="field-error" id={`e-${field}`}>
        {texts[error]}
      </p>
    );
  }

  const typeLabels: Record<(typeof REQUEST_TYPES)[number], string> = {
    service: t("طلب خدمة", "Service request"),
    venture: t("استفسار عن مشروع", "About a venture"),
    partnership: t("شراكة وتعاون", "Partnership"),
    education: t("تعليم وتدريب", "Education & training"),
    media: t("إعلام ونشر", "Media"),
    other: t("أخرى", "Other"),
  };
  const budgetLabels: Record<(typeof BUDGETS)[number], string> = {
    "": t("— اختر (اختياري) —", "— Choose (optional) —"),
    "under-1k": t("أقل من 1,000 دولار", "Under $1,000"),
    "1k-5k": t("1,000 – 5,000 دولار", "$1,000 – $5,000"),
    "5k-15k": t("5,000 – 15,000 دولار", "$5,000 – $15,000"),
    "15k-plus": t("أكثر من 15,000 دولار", "Over $15,000"),
    "not-sure": t("غير محدد بعد", "Not sure yet"),
  };

  const mailto = `mailto:${CONTACT.email}?subject=${encodeURIComponent(`[TechMood] ${typeLabels[draft.type as keyof typeof typeLabels] ?? t("طلب تواصل", "Contact request")} — ${draft.name}`)}&body=${encodeURIComponent(
    [draft.message, "", draft.name, draft.email, draft.organization].filter(Boolean).join("\n"),
  )}`;

  return (
    <form className="form" action={action} onSubmit={onSubmit} noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="started_at" value={startedAt} />
      <input type="hidden" name="topic" value={topic ?? ""} />
      <div className="hp" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div ref={resultRef} tabIndex={-1} aria-live="polite" style={{ outline: "none" }}>
        {state.status === "sent" && (
          <div className="alert alert-success" role="status">
            <Icon name="check" size={20} />
            <div>
              <strong>{t("وصل طلبك. شكرًا لتواصلك!", "Your request was received. Thank you!")}</strong>
              {t("سنراجع رسالتك ونرد على بريدك الإلكتروني.", "We'll review your message and reply by email.")}
            </div>
          </div>
        )}
        {state.status === "not_configured" && (
          <div className="alert alert-info" role="alert">
            <Icon name="mail" size={20} />
            <div>
              <strong>{t("لم يُرسل الطلب: الإرسال المباشر من الموقع غير مفعّل بعد.", "Not sent: sending directly from the website isn't set up yet.")}</strong>
              {t("رسالتك محفوظة على جهازك. أرسلها بالبريد بضغطة واحدة: ", "Your message is saved on this device. Send it by email in one tap: ")}
              <a href={mailto}>{t("افتح البريد مع رسالتك", "Open email with your message")}</a>
              {t("، أو راسلنا على Telegram ", ", or message us on Telegram ")}
              <a href={CONTACT.telegramChannel.href} target="_blank" rel="noopener noreferrer" className="ltr">
                {CONTACT.telegramChannel.handle}
              </a>
              .
            </div>
          </div>
        )}
        {(state.status === "failed" || state.status === "spam") && (
          <div className="alert alert-error" role="alert">
            <Icon name="close" size={20} />
            <div>
              <strong>{t("تعذّر إرسال الطلب.", "We couldn't send your request.")}</strong>
              {t("رسالتك ما زالت محفوظة. حاول مرة أخرى بعد قليل، أو ", "Your message is still saved. Try again shortly, or ")}
              <a href={mailto}>{t("أرسلها بالبريد", "send it by email")}</a>.
            </div>
          </div>
        )}
        {state.status === "rate_limited" && (
          <div className="alert alert-error" role="alert">
            <Icon name="close" size={20} />
            <div>
              <strong>{t("محاولات كثيرة خلال وقت قصير.", "Too many attempts in a short time.")}</strong>
              {t("انتظر عشر دقائق ثم حاول مجددًا، أو ", "Wait ten minutes and try again, or ")}
              <a href={mailto}>{t("أرسلها بالبريد", "send it by email")}</a>.
            </div>
          </div>
        )}
        {state.status === "invalid" && !hasErrors(clientErrors) && (
          <div className="alert alert-error" role="alert">
            <Icon name="close" size={20} />
            <div>{t("راجع الحقول المشار إليها.", "Please check the highlighted fields.")}</div>
          </div>
        )}
      </div>

      {restored && (
        <div className="draft-note">
          <span>
            <Icon name="refresh" size={14} /> {t("استعدنا مسودتك غير المرسلة من هذا الجهاز.", "We restored your unsent draft from this device.")}
          </span>
          <button type="button" className="link-btn" onClick={discardDraft}>
            {t("ابدأ من جديد", "Start over")}
          </button>
        </div>
      )}

      {topicLabel && (
        <p className="note">
          <Icon name="target" size={18} />
          <span>
            {t("بخصوص: ", "Regarding: ")}
            <strong>{topicLabel}</strong>
          </span>
        </p>
      )}

      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }} aria-describedby={errors.type ? "e-type" : undefined}>
        <legend style={{ marginBottom: 8 }}>{t("نوع الطلب", "Request type")}</legend>
        <div className="type-grid">
          {REQUEST_TYPES.map((type, index) => (
            <label key={type} className="type-option">
              <input
                type="radio"
                name="type"
                value={type}
                id={index === 0 ? "f-type" : undefined}
                checked={draft.type === type}
                onChange={() => update("type", type)}
              />
              <span>
                <Icon name={TYPE_ICONS[type]} size={18} />
                {typeLabels[type]}
              </span>
            </label>
          ))}
        </div>
        {message("type", errors.type)}
      </fieldset>

      <div className="row-2">
        <div className="field">
          <label htmlFor="f-name">{t("الاسم", "Name")}</label>
          <input
            id="f-name"
            name="name"
            className="input"
            autoComplete="name"
            maxLength={LIMITS.name}
            value={draft.name}
            onChange={(event) => update("name", event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "e-name" : undefined}
            required
          />
          {message("name", errors.name)}
        </div>
        <div className="field">
          <label htmlFor="f-email">{t("البريد الإلكتروني", "Email")}</label>
          <input
            id="f-email"
            name="email"
            type="email"
            dir="ltr"
            className="input"
            autoComplete="email"
            inputMode="email"
            maxLength={LIMITS.email}
            value={draft.email}
            onChange={(event) => update("email", event.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "e-email" : undefined}
            required
          />
          {message("email", errors.email)}
        </div>
      </div>

      <div className="row-2">
        <div className="field">
          <label htmlFor="f-organization">
            {t("الجهة أو الشركة", "Organisation or company")} <span className="opt">{t("(اختياري)", "(optional)")}</span>
          </label>
          <input
            id="f-organization"
            name="organization"
            className="input"
            autoComplete="organization"
            maxLength={LIMITS.organization}
            value={draft.organization}
            onChange={(event) => update("organization", event.target.value)}
            aria-invalid={Boolean(errors.organization)}
          />
          {message("organization", errors.organization)}
        </div>
        <div className="field">
          <label htmlFor="f-budget">
            {t("الميزانية التقديرية", "Estimated budget")} <span className="opt">{t("(اختياري)", "(optional)")}</span>
          </label>
          <select id="f-budget" name="budget" className="input" value={draft.budget} onChange={(event) => update("budget", event.target.value)}>
            {BUDGETS.map((budget) => (
              <option key={budget} value={budget}>
                {budgetLabels[budget]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="f-message">{t("وصف المشروع أو الطلب", "Describe your project or request")}</label>
        <textarea
          id="f-message"
          name="message"
          className="input"
          maxLength={LIMITS.message}
          value={draft.message}
          onChange={(event) => update("message", event.target.value)}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={`h-message${errors.message ? " e-message" : ""}`}
          placeholder={t("ما الذي تريد تحقيقه؟ ومن سيستخدمه؟ وهل لديك موعد مستهدف؟", "What do you want to achieve? Who will use it? Is there a target date?")}
          required
        />
        <div className="draft-note" id="h-message">
          <span>{t("تُحفظ مسودتك تلقائيًا على هذا الجهاز حتى ترسلها.", "Your draft is saved on this device until you send it.")}</span>
          <span className="counter">
            {draft.message.length}/{LIMITS.message}
          </span>
        </div>
        {message("message", errors.message)}
      </div>

      <div className="field">
        <label className="consent" htmlFor="f-consent">
          <input
            id="f-consent"
            name="consent"
            type="checkbox"
            checked={consent}
            onChange={(event) => {
              setConsent(event.target.checked);
              if (clientErrors.consent) setClientErrors((current) => ({ ...current, consent: undefined }));
            }}
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={errors.consent ? "e-consent" : undefined}
          />
          <span>
            {t("أوافق على ", "I agree to the ")}
            <Link href={href(locale, "/privacy")} target="_blank">
              {t("سياسة الخصوصية", "privacy policy")}
            </Link>
            {t(" واستخدام بياناتي للرد على طلبي.", " and the use of my details to answer my request.")}
          </span>
        </label>
        {message("consent", errors.consent)}
      </div>

      <div>
        <button type="submit" className="btn btn-primary" disabled={pending} style={{ minWidth: 200 }}>
          {pending ? <span className="spinner" aria-hidden="true" /> : <Icon name="arrow" size={18} className="flip-rtl" />}
          {pending ? t("جارٍ الإرسال…", "Sending…") : t("أرسل الطلب", "Send request")}
        </button>
      </div>
    </form>
  );
}
