"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import {
  type LocalFormRecord,
  localStorageAvailable,
  hasLocalVault,
  createLocalVault,
  unlockLocalVault,
  writeLocalRecords,
  downloadEncryptedBackup,
  restoreEncryptedBackup,
} from "@/lib/local/vault";

type Props = {
  templateId: string;
  templateTitle: string;
  values: Record<string, string>;
  onRestore: (record: LocalFormRecord) => void;
};

export function LocalVaultPanel({ templateId, templateTitle, values, onRestore }: Props) {
  const [exists, setExists] = useState<boolean | null>(null);
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [records, setRecords] = useState<LocalFormRecord[]>([]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [backupPassword, setBackupPassword] = useState("");
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!localStorageAvailable()) { setExists(false); return; }
    hasLocalVault().then(setExists).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : "تعذّرت قراءة التخزين المحلي.");
      setExists(null);
    });
  }, []);

  const working = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try { await action(); }
    catch (e) { setError(e instanceof Error ? e.message : "تعذّر إكمال العملية."); }
    finally { setBusy(false); }
  };

  const openOrCreate = () => working(async () => {
    if (!password) throw new Error("أدخل كلمة مرور القاعدة المحلية.");
    if (exists === false && password !== confirmPassword) throw new Error("تأكيد كلمة المرور لا يطابقها.");
    const opened = exists ? await unlockLocalVault(password) : await createLocalVault(password);
    setKey(opened.key);
    setRecords(opened.records);
    setExists(true);
    setPassword("");
    setConfirmPassword("");
    setNotice(exists ? "فُتحت السجلات المشفرة على هذا الجهاز." : "تم إنشاء قاعدة محلية مشفرة. أنشئ نسخة احتياطية بعد أول حفظ.");
  });

  const save = () => working(async () => {
    if (!key) throw new Error("افتح القاعدة المحلية أولًا.");
    const scoped = Object.fromEntries(Object.entries(values).filter(([name, value]) =>
      name.startsWith(`${templateId}:`) && value.trim().length > 0));
    if (Object.keys(scoped).length === 0) throw new Error("أدخل بيانات في النموذج قبل حفظه.");
    const now = new Date().toISOString();
    const entry: LocalFormRecord = {
      id: crypto.randomUUID(),
      templateId, title: title.trim() || `${templateTitle} · ${new Date().toLocaleDateString("ar-PS")}`,
      values: scoped,
      createdAt: now, updatedAt: now,
    };
    const next = [entry, ...records];
    await writeLocalRecords(key, next);
    setRecords(next);
    setTitle("");
    setNotice("تم حفظ نسخة مشفرة من هذا النموذج على هذا الجهاز.");
  });

  const remove = (record: LocalFormRecord) => working(async () => {
    if (!key) throw new Error("افتح القاعدة المحلية أولًا.");
    if (!window.confirm(`حذف «${record.title}» نهائيًا من هذا الجهاز؟`)) return;
    const next = records.filter((item) => item.id !== record.id);
    await writeLocalRecords(key, next);
    setRecords(next);
    setNotice("حُذف السجل من القائمة المحلية.");
  });

  const exportBackup = () => working(async () => {
    if (!key) throw new Error("افتح القاعدة المحلية أولًا.");
    await downloadEncryptedBackup();
    setNotice("تم بدء تنزيل النسخة الاحتياطية المشفرة. احتفظ بها وكلمة مرورها في مكانين منفصلين.");
  });

  const importBackup = () => working(async () => {
    if (!backupFile) throw new Error("اختر ملف النسخة الاحتياطية المشفرة.");
    if (!backupPassword) throw new Error("أدخل كلمة مرور النسخة الاحتياطية.");
    if (!window.confirm("ستحل النسخة المستوردة محل جميع السجلات المحلية الحالية. هل لديك نسخة احتياطية من بياناتك الحالية؟")) return;
    await restoreEncryptedBackup(backupFile, backupPassword);
    setKey(null);
    setRecords([]);
    setExists(true);
    setPassword("");
    setConfirmPassword("");
    setBackupPassword("");
    setBackupFile(null);
    setNotice("اكتملت الاستعادة. أدخل كلمة مرور النسخة المستوردة لفتحها.");
  });

  const isSupported = localStorageAvailable();

  return (
    <section className="local-vault forms-tools" aria-labelledby="local-vault-title">
      <div className="local-vault-heading">
        <span className="local-vault-mark"><Icon name="shield" size={24} /></span>
        <div>
          <h2 id="local-vault-title">حفظ السجلات محليًا وبالتشفير</h2>
          <p>بياناتك تبقى في هذا المتصفح على هذا الجهاز باستخدام IndexedDB وتشفير AES-GCM بكلمة مرور.</p>
        </div>
      </div>

      {!isSupported ? (
        <p className="forms-notice" role="alert">
          لا يمكن استخدام التخزين المشفر هنا. افتح المنصة باستخدام HTTPS في متصفح حديث يسمح بالتخزين المحلي.
        </p>
      ) : exists === null ? (
        <p className="text-sm text-muted">جارٍ التحقق من قاعدة البيانات المحلية...</p>
      ) : key === null ? (
        <div className="local-vault-auth">
          <p className="local-vault-hint">
            {exists
              ? "قاعدة بيانات محلية موجودة. أدخل كلمة مرورها لفتح السجلات."
              : "ابدأ بإنشاء كلمة مرور قوية (10 أحرف على الأقل). لا يمكن استعادتها من الخادم لأنها لا تُرسل إليه."}
          </p>
          <label className="forms-field">
            <span>{exists ? "كلمة مرور القاعدة" : "إنشاء كلمة مرور"}</span>
            <input type="password" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {!exists && (
            <label className="forms-field">
              <span>تأكيد كلمة المرور</span>
              <input type="password" autoComplete="off" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </label>
          )}
          <button type="button" disabled={busy} className="btn btn-primary" onClick={openOrCreate}>
            <Icon name={exists ? "lock" : "plus"} size={18} />{exists ? "فتح السجلات" : "إنشاء حفظ محلي"}
          </button>
        </div>
      ) : (
        <>
          <div className="local-vault-status">
            <span><Icon name="checkCircle" size={17} /> قاعدة مشفرة مفتوحة · {records.length} سجل</span>
            <button type="button" className="btn btn-secondary !min-h-9" onClick={() => {
              setKey(null); setRecords([]); setNotice("تم قفل قاعدة البيانات على هذه الصفحة.");
            }}>
              <Icon name="lock" size={17} /> قفل
            </button>
          </div>
          <div className="local-vault-save">
            <label className="forms-field">
              <span>عنوان السجل (اختياري)</span>
              <input placeholder={`${templateTitle} · اسم الطالب أو الحلقة`} value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>
              <Icon name="checkCircle" size={18} /> حفظ نسخة من النموذج الحالي
            </button>
          </div>
          <div className="local-vault-list">
            <h3>السجلات المحفوظة</h3>
            {records.length === 0 ? <p className="text-sm text-muted">لا توجد سجلات بعد. أدخل بيانات النموذج واضغط حفظ.</p> :
              <ul>
                {records.map((record) => (
                  <li key={record.id}>
                    <div><strong>{record.title}</strong><small>{new Date(record.updatedAt).toLocaleString("ar-PS")}</small></div>
                    <div className="local-vault-list-actions">
                      <button type="button" className="btn btn-secondary !min-h-9 !px-3" disabled={busy} onClick={() => {
                        onRestore(record); setNotice("تم تحميل السجل إلى النموذج. لحفظ التعديلات أنشئ نسخة جديدة.");
                      }}>فتح</button>
                      <button type="button" className="btn btn-ghost !min-h-9 !px-3 text-danger" disabled={busy} onClick={() => remove(record)}>حذف</button>
                    </div>
                  </li>
                ))}
              </ul>}
          </div>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={exportBackup}>
            <Icon name="install" size={18} /> تنزيل نسخة احتياطية مشفرة
          </button>
        </>
      )}

      {isSupported && exists !== null && (
        <details className="local-vault-import">
          <summary>استعادة نسخة احتياطية من الجهاز</summary>
          <div className="local-vault-import-fields">
            <label className="forms-field">
              <span>ملف النسخة الاحتياطية JSON</span>
              <input type="file" accept=".json,application/json" onChange={(e) => setBackupFile(e.target.files?.[0] ?? null)} />
            </label>
            <label className="forms-field">
              <span>كلمة مرور النسخة المستوردة</span>
              <input type="password" autoComplete="off" value={backupPassword} onChange={(e) => setBackupPassword(e.target.value)} />
            </label>
            <button type="button" className="btn btn-secondary" disabled={busy || !backupFile || !backupPassword} onClick={importBackup}>
              تحقق من النسخة واستعدها
            </button>
          </div>
        </details>
      )}

      {error && <p role="alert" className="local-vault-error">{error}</p>}
      {notice && <p role="status" className="local-vault-success">{notice}</p>}
      <p className="local-vault-caveat">
        <strong>مهم:</strong> لا مزامنة مع الأجهزة الأخرى ولا استعادة لكلمة المرور. حذف بيانات المتصفح أو تبديل الهاتف قد يفقد سجلاتك.
        أنشئ نسخة احتياطية مشفرة بعد كل تحديث مهم. لا تُعد هذه النسخة نظام صلاحيات لمراكز متعددة أو بديلًا عن خادم مؤسسي آمن.
      </p>
    </section>
  );
}
