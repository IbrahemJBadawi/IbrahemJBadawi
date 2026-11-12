/**
 * Local-only, encrypted form records for Halaqati.
 * No API calls, no localStorage of credentials or plaintext, no Supabase dependency.
 * Data is device/browser/origin-specific. Backup is an encrypted JSON file.
 */
export type LocalFormRecord = {
  id: string;
  templateId: string;
  title: string;
  values: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};
type VaultData = { version: 1; records: LocalFormRecord[] };
type EncryptedVault = {
  kind: "halaqati-encrypted-vault";
  version: 1;
  salt: number[];
  iv: number[];
  ciphertext: number[];
  updatedAt: string;
};

const DATABASE = "halaqati-local-vault-v1";
const STORE = "private-vault";
const VAULT_ID = "current";
const ITERATIONS = 310_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function localStorageAvailable(): boolean {
  return typeof window !== "undefined" && window.isSecureContext &&
    typeof indexedDB !== "undefined" && Boolean(globalThis.crypto?.subtle);
}

function bytes(size: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(size));
}

function asBytes(values: number[]): Uint8Array<ArrayBuffer> {
  return new Uint8Array(values);
}

function openDatabase(): Promise<IDBDatabase> {
  if (!localStorageAvailable()) return Promise.reject(new Error("الحفظ المشفّر يحتاج متصفحًا يدعم IndexedDB واتصال HTTPS."));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("تعذّر فتح مساحة التخزين المحلية."));
    request.onblocked = () => reject(new Error("أغلق التبويبات الأخرى للمنصة وأعد المحاولة."));
  });
}

async function readRaw(): Promise<EncryptedVault | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(VAULT_ID);
    let value: EncryptedVault | null = null;
    req.onsuccess = () => { value = (req.result as EncryptedVault | undefined) ?? null; };
    tx.oncomplete = () => { db.close(); resolve(value); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error("تعذّرت قراءة البيانات المحلية.")); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error("تعذّرت قراءة البيانات المحلية.")); };
  });
}

async function writeRaw(value: EncryptedVault): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, VAULT_ID);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error("فشل حفظ البيانات. قد تكون مساحة الجهاز ممتلئة.")); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error("فشل حفظ البيانات.")); };
  });
}

async function keyFromPassword(password: string, salt: number[]): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: asBytes(salt), iterations: ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function validRaw(value: unknown): value is EncryptedVault {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<EncryptedVault>;
  const arr = (a: unknown, size?: number): a is number[] =>
    Array.isArray(a) && (size === undefined ? a.length > 16 && a.length < 20_000_000 : a.length === size) &&
    a.every((n) => Number.isInteger(n) && n >= 0 && n <= 255);
  return v.kind === "halaqati-encrypted-vault" && v.version === 1 &&
    arr(v.salt, 16) && arr(v.iv, 12) && arr(v.ciphertext) && typeof v.updatedAt === "string";
}

function validateData(data: unknown): VaultData {
  if (!data || typeof data !== "object") throw new Error("البيانات المحفوظة غير متوافقة.");
  const item = data as Partial<VaultData>;
  if (item.version !== 1 || !Array.isArray(item.records)) throw new Error("تنسيق قاعدة البيانات المحلية غير مدعوم.");
  if (item.records.some((r) => !r || typeof r.id !== "string" || typeof r.templateId !== "string" ||
    typeof r.title !== "string" || !r.values || typeof r.values !== "object" ||
    Array.isArray(r.values) || Object.values(r.values).some((v) => typeof v !== "string"))) {
    throw new Error("سجل واحد على الأقل غير صالح.");
  }
  return item as VaultData;
}

async function decryptRaw(raw: EncryptedVault, password: string): Promise<{ key: CryptoKey; records: LocalFormRecord[] }> {
  if (!validRaw(raw)) throw new Error("تنسيق النسخة المشفرة غير صالح.");
  const key = await keyFromPassword(password, raw.salt);
  try {
    const buffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv: asBytes(raw.iv) }, key, asBytes(raw.ciphertext));
    const data = validateData(JSON.parse(decoder.decode(buffer)));
    return { key, records: data.records };
  } catch {
    throw new Error("كلمة المرور غير صحيحة أو النسخة المشفرة تالفة.");
  }
}

async function encryptData(key: CryptoKey, salt: number[], records: LocalFormRecord[]): Promise<EncryptedVault> {
  const iv = bytes(12);
  const plaintext = encoder.encode(JSON.stringify({ version: 1, records } satisfies VaultData));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return {
    kind: "halaqati-encrypted-vault", version: 1, salt,
    iv: Array.from(iv), ciphertext: Array.from(new Uint8Array(cipher)),
    updatedAt: new Date().toISOString(),
  };
}

export async function hasLocalVault(): Promise<boolean> {
  return Boolean(await readRaw());
}

export async function createLocalVault(password: string): Promise<{ key: CryptoKey; records: LocalFormRecord[] }> {
  if (password.length < 10) throw new Error("اختر كلمة مرور من 10 أحرف على الأقل.");
  if (await readRaw()) throw new Error("توجد قاعدة محلية مسبقًا. افتحها بدل استبدالها.");
  const salt = Array.from(bytes(16));
  const key = await keyFromPassword(password, salt);
  await writeRaw(await encryptData(key, salt, []));
  return { key, records: [] };
}

export async function unlockLocalVault(password: string): Promise<{ key: CryptoKey; records: LocalFormRecord[] }> {
  const raw = await readRaw();
  if (!raw) throw new Error("لم يتم إنشاء قاعدة محلية على هذا الجهاز.");
  return decryptRaw(raw, password);
}

export async function writeLocalRecords(key: CryptoKey, records: LocalFormRecord[]): Promise<void> {
  validateData({ version: 1, records });
  const old = await readRaw();
  if (!old || !validRaw(old)) throw new Error("القاعدة المحلية غير موجودة أو تالفة.");
  await writeRaw(await encryptData(key, old.salt, records));
}

export async function downloadEncryptedBackup(): Promise<void> {
  const raw = await readRaw();
  if (!raw || !validRaw(raw)) throw new Error("لا توجد قاعدة بيانات محلية للتصدير.");
  const file = new Blob([JSON.stringify(raw)], { type: "application/json" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `halaqati-local-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Verifies the backup password and integrity before overwriting existing local data. */
export async function restoreEncryptedBackup(file: File, backupPassword: string): Promise<void> {
  if (file.size < 40 || file.size > 15_000_000) throw new Error("حجم ملف النسخة الاحتياطية غير مقبول (الحد 15 ميغابايت).");
  let raw: unknown;
  try { raw = JSON.parse(await file.text()); }
  catch { throw new Error("الملف ليس نسخة JSON صحيحة."); }
  if (!validRaw(raw)) throw new Error("الملف لا يحتوي على نسخة حلقاتي مشفرة صحيحة.");
  await decryptRaw(raw, backupPassword);
  await writeRaw(raw);
}
