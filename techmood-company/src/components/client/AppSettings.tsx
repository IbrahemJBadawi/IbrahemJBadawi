"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { VENTURES } from "@/data/ventures";
import { useLocale, useT } from "@/i18n/client";
import { promptInstall, useInstallState } from "@/lib/install-client";
import { disableNotifications, enableNotifications, showNotification, useNotifyPermission } from "@/lib/notify-client";
import { STORAGE_KEYS, clearAllStorage, useStored } from "@/lib/storage";
import { LanguageSwitch } from "./LanguageSwitch";
import { ThemeChoicePicker } from "./ThemeToggle";

export function InstallCard() {
  const t = useT();
  const { installed, canPrompt, apple } = useInstallState();
  const [result, setResult] = useState("");
  return (
    <div className="card">
      <div className="setting">
        <span className="icon-tile">
          <Icon name="download" size={24} />
        </span>
        <div className="text">
          <h2 style={{ fontSize: "1.1rem" }}>{t("ثبّت TechMood على جهازك", "Install TechMood on your device")}</h2>
          <p>
            {installed
              ? t("الموقع مثبّت ويعمل كتطبيق على هذا الجهاز.", "The site is installed and runs as an app on this device.")
              : t("أيقونة على الشاشة الرئيسية، وفتح سريع بلا شريط المتصفح، وصفحات تعمل دون اتصال بعد زيارتها.", "An icon on your home screen, fast opening without the browser bar, and pages that work offline once visited.")}
          </p>
        </div>
        {installed ? (
          <span className="status status-live">{t("مثبّت", "Installed")}</span>
        ) : canPrompt ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={async () => setResult((await promptInstall()) ? t("تم التثبيت.", "Installed.") : t("لم يكتمل التثبيت.", "Install not completed."))}
          >
            <Icon name="download" size={17} />
            {t("ثبّت الآن", "Install now")}
          </button>
        ) : null}
      </div>
      {!installed && !canPrompt && (
        <ol className="check-list" style={{ marginTop: 8 }}>
          {apple ? (
            <>
              <li>
                <Icon name="check" size={18} />
                {t("افتح الموقع في Safari.", "Open the site in Safari.")}
              </li>
              <li>
                <Icon name="check" size={18} />
                {t("اضغط زر المشاركة ⬆︎ أسفل الشاشة.", "Tap the Share button ⬆︎ at the bottom.")}
              </li>
              <li>
                <Icon name="check" size={18} />
                {t("اختر «إضافة إلى الشاشة الرئيسية» ثم «إضافة».", "Choose “Add to Home Screen”, then “Add”.")}
              </li>
            </>
          ) : (
            <>
              <li>
                <Icon name="check" size={18} />
                {t("في Chrome أو Edge: افتح قائمة المتصفح ⋮.", "In Chrome or Edge: open the browser menu ⋮.")}
              </li>
              <li>
                <Icon name="check" size={18} />
                {t("اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».", "Choose “Install app” or “Add to Home screen”.")}
              </li>
            </>
          )}
        </ol>
      )}
      {result && (
        <p role="status" className="note">
          {result}
        </p>
      )}
    </div>
  );
}

export function NotificationsCard() {
  const t = useT();
  const locale = useLocale();
  const permission = useNotifyPermission();
  const [pref] = useStored<string>(STORAGE_KEYS.notifications, "off");
  const [message, setMessage] = useState("");
  const on = permission === "granted" && pref === "on";

  async function toggle() {
    if (on) {
      disableNotifications();
      setMessage(t("أُوقفت الإشعارات على هذا الجهاز.", "Notifications turned off on this device."));
      return;
    }
    const result = await enableNotifications();
    if (result === "granted") {
      const shown = await showNotification(
        t("الإشعارات مفعّلة", "Notifications are on"),
        t("ستصلك مستجدات TechMood وتغيّرات المشاريع التي تتابعها.", "You'll get TechMood updates and status changes for ventures you follow."),
        "/",
        locale,
      );
      setMessage(shown ? t("فُعّلت الإشعارات، وأرسلنا إشعارًا تجريبيًا.", "Notifications are on — we sent a test notification.") : t("فُعّلت الإشعارات.", "Notifications are on."));
    } else if (result === "denied") {
      setMessage(t("رفض المتصفح الإذن. فعّله من إعدادات الموقع في المتصفح ثم أعد المحاولة.", "The browser denied permission. Allow it in the site settings, then try again."));
    } else if (result === "unsupported") {
      setMessage(t("هذا المتصفح لا يدعم الإشعارات. على iPhone ثبّت الموقع أولًا على الشاشة الرئيسية.", "This browser doesn't support notifications. On iPhone, install the site to the home screen first."));
    }
  }

  return (
    <div className="card">
      <div className="setting">
        <span className="icon-tile is-sky">
          <Icon name="bell" size={24} />
        </span>
        <div className="text">
          <h2 style={{ fontSize: "1.1rem" }}>{t("إشعارات الجهاز", "Device notifications")}</h2>
          <p>
            {t(
              "عند فتح الموقع أو التطبيق، يصلك إشعار بكل خبر جديد وبتغيّر حالة المشاريع التي تتابعها.",
              "When you open the site or app, you get a notification for each new update and for status changes of ventures you follow.",
            )}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          className="switch"
          aria-checked={on}
          aria-label={t("إشعارات الجهاز", "Device notifications")}
          onClick={toggle}
        />
      </div>
      {permission === "denied" && (
        <p className="note is-warn">
          <Icon name="bell" size={18} />
          {t("الإشعارات محظورة من المتصفح لهذا الموقع.", "Notifications are blocked by the browser for this site.")}
        </p>
      )}
      <p className="note">
        <Icon name="shield" size={18} />
        {t(
          "لا نجمع أي بيانات لإرسال الإشعارات: كل ما يلزم محفوظ على جهازك فقط. الإشعارات أثناء إغلاق الموقع تتطلب خادمًا وستُضاف لاحقًا.",
          "We collect nothing to send notifications: everything needed stays on your device. Notifications while the site is closed need a server and will come later.",
        )}
      </p>
      {message && (
        <p role="status" className="note">
          {message}
        </p>
      )}
    </div>
  );
}

export function PreferencesCard() {
  const t = useT();
  return (
    <div className="card">
      <div className="setting">
        <div className="text">
          <h2 style={{ fontSize: "1.1rem" }}>{t("المظهر", "Appearance")}</h2>
          <p>{t("فاتح أو داكن أو حسب إعداد جهازك.", "Light, dark or following your device.")}</p>
        </div>
        <ThemeChoicePicker />
      </div>
      <div className="setting" style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
        <div className="text">
          <h2 style={{ fontSize: "1.1rem" }}>{t("اللغة", "Language")}</h2>
          <p>{t("يُحفظ اختيارك لزياراتك القادمة.", "Your choice is remembered for next time.")}</p>
        </div>
        <LanguageSwitch className="btn btn-ghost btn-sm" />
      </div>
    </div>
  );
}

export function LocalDataCard() {
  const t = useT();
  const locale = useLocale();
  const [following] = useStored<Record<string, string>>(STORAGE_KEYS.following, {});
  const [draft] = useStored<{ message?: string } | null>(STORAGE_KEYS.contactDraft, null);
  const [seen] = useStored<string[]>(STORAGE_KEYS.seenUpdates, []);
  const [theme] = useStored<string>(STORAGE_KEYS.theme, "system");
  const [cleared, setCleared] = useState(false);
  const followed = VENTURES.filter((venture) => following[venture.slug]).map((venture) => venture.name[locale]);

  const rows = [
    { what: t("المظهر", "Appearance"), value: theme === "dark" ? t("داكن", "Dark") : theme === "light" ? t("فاتح", "Light") : t("حسب الجهاز", "Device") },
    { what: t("المشاريع التي تتابعها", "Ventures you follow"), value: followed.length ? followed.join("، ") : t("لا شيء", "None") },
    { what: t("المستجدات المقروءة", "Updates read"), value: String(seen.length) },
    { what: t("مسودة نموذج التواصل", "Contact form draft"), value: draft?.message ? t("محفوظة", "Saved") : t("لا توجد", "None") },
  ];

  return (
    <div className="card">
      <div className="setting">
        <span className="icon-tile is-navy">
          <Icon name="shield" size={24} />
        </span>
        <div className="text">
          <h2 style={{ fontSize: "1.1rem" }}>{t("بياناتك على هذا الجهاز", "Your data on this device")}</h2>
          <p>{t("يحفظ الموقع تفضيلاتك في التخزين المحلي للمتصفح فقط، ولا يرسلها إلى أي خادم.", "The site keeps your preferences in the browser's local storage only, and never sends them to a server.")}</p>
        </div>
      </div>
      <table className="storage-table">
        <thead>
          <tr>
            <th scope="col">{t("العنصر", "Item")}</th>
            <th scope="col">{t("القيمة", "Value")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.what}>
              <td>{row.what}</td>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            if (window.confirm(t("مسح كل ما حفظه الموقع على هذا الجهاز؟", "Clear everything this site saved on this device?"))) {
              clearAllStorage();
              setCleared(true);
            }
          }}
        >
          <Icon name="trash" size={16} />
          {t("مسح البيانات المحلية", "Clear local data")}
        </button>
        {cleared && (
          <p role="status" className="note" style={{ marginTop: 10 }}>
            {t("مُسحت البيانات المحلية.", "Local data cleared.")}
          </p>
        )}
      </div>
    </div>
  );
}
