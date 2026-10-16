"use client";

/**
 * محرر عام لجداول المحتوى في لوحة الإدارة. كل العمليات تتم بجلسة المستخدم نفسه،
 * وقاعدة البيانات (RLS) هي التي تقرر السماح بها — الواجهة لا تمنح أي صلاحية.
 */
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { getSupabase } from "@/lib/supabase/client";

export type Row = Record<string, unknown>;

export interface FieldDef {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "checkbox" | "date" | "list" | "quranRefs";
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
  /** يُعرض فقط عند إنشاء سجل جديد (مثل المعرّف) */
  createOnly?: boolean;
  rows?: number;
  preview?: (draft: Row) => ReactNode;
}

export interface CrudConfig {
  table: string;
  title: string;
  keys: string[];
  select?: string;
  order: { column: string; ascending?: boolean }[];
  fields: FieldDef[];
  defaults: Row;
  rowTitle: (r: Row) => ReactNode;
  rowMeta?: (r: Row) => ReactNode;
  filter?: { column: string; label: string; options: { value: string; label: string }[] };
  validate?: (r: Row) => string | null;
}

/** تحويل "2:255-255" أو "112:1-4" (سطر لكل مرجع) إلى مصفوفة مراجع */
export function parseRefs(text: string): { surah: number; from: number; to: number }[] | null {
  const lines = text.split(/[\n;،,]+/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  const out = [];
  for (const l of lines) {
    const m = l.match(/^(\d{1,3})\s*:\s*(\d{1,3})(?:\s*-\s*(\d{1,3}))?$/);
    if (!m) throw new Error(`صيغة مرجع غير صحيحة: ${l}`);
    out.push({ surah: Number(m[1]), from: Number(m[2]), to: Number(m[3] ?? m[2]) });
  }
  return out;
}

export function formatRefs(v: unknown): string {
  if (!Array.isArray(v)) return "";
  return v.map((r: { surah: number; from: number; to: number }) => `${r.surah}:${r.from}-${r.to}`).join("\n");
}

function toDraft(fields: FieldDef[], r: Row): Row {
  const d: Row = { ...r };
  for (const f of fields) {
    if (f.type === "list") d[f.name] = Array.isArray(r[f.name]) ? (r[f.name] as string[]).join("\n") : "";
    if (f.type === "quranRefs") d[f.name] = formatRefs(r[f.name]);
  }
  return d;
}

function fromDraft(fields: FieldDef[], d: Row): Row {
  const out: Row = {};
  for (const f of fields) {
    const v = d[f.name];
    switch (f.type) {
      case "number":
        out[f.name] = v === "" || v === null || v === undefined ? null : Number(v);
        break;
      case "checkbox":
        out[f.name] = !!v;
        break;
      case "list":
        out[f.name] = String(v ?? "")
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean);
        break;
      case "quranRefs":
        out[f.name] = parseRefs(String(v ?? ""));
        break;
      default: {
        const s = typeof v === "string" ? v.trim() : v;
        out[f.name] = s === "" ? null : s;
      }
    }
  }
  return out;
}

function arabicDbError(message: string): string {
  if (message.includes("row-level security") || message.includes("permission denied")) return "ليست لديك صلاحية لهذا الإجراء.";
  if (message.includes("duplicate key")) return "يوجد سجل بالمعرّف نفسه أو بالتاريخ نفسه.";
  if (message.includes("violates check constraint")) return `قيمة غير صالحة (${message.match(/"([^"]+)"/)?.[1] ?? "تحقق من الحقول"}).`;
  if (message.includes("violates foreign key")) return "مرتبط بسجل غير موجود أو مستخدم في سجلات أخرى.";
  return message;
}

export function AdminCrud({ config }: { config: CrudConfig }) {
  const supabase = getSupabase();
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ draft: Row; isNew: boolean; original?: Row } | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    if (!supabase) return;
    setError(null);
    let query = supabase.from(config.table).select(config.select ?? "*");
    for (const o of config.order) query = query.order(o.column, { ascending: o.ascending ?? true });
    const { data, error: err } = await query.limit(1000);
    if (err) setError(arabicDbError(err.message));
    else setRows((data ?? []) as unknown as Row[]);
  }, [supabase, config]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    let r = rows ?? [];
    if (filter && config.filter) r = r.filter((x) => String(x[config.filter!.column]) === filter);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      r = r.filter((x) => JSON.stringify(x).toLowerCase().includes(s));
    }
    return r;
  }, [rows, filter, q, config.filter]);

  const keyFilter = (r: Row) => Object.fromEntries(config.keys.map((k) => [k, r[k]]));

  const save = async () => {
    if (!supabase || !editing) return;
    setFormError(null);
    let payload: Row;
    try {
      payload = fromDraft(config.fields, editing.draft);
    } catch (e) {
      return setFormError((e as Error).message);
    }
    for (const f of config.fields) {
      if (f.required && (payload[f.name] === null || payload[f.name] === undefined || payload[f.name] === "")) {
        return setFormError(`الحقل «${f.label}» مطلوب.`);
      }
    }
    const v = config.validate?.(payload);
    if (v) return setFormError(v);
    setSaving(true);
    const res = editing.isNew
      ? await supabase.from(config.table).insert(payload)
      : await supabase
          .from(config.table)
          .update(Object.fromEntries(Object.entries(payload).filter(([k]) => !config.fields.find((f) => f.name === k)?.createOnly)))
          .match(keyFilter(editing.original!));
    setSaving(false);
    if (res.error) return setFormError(arabicDbError(res.error.message));
    toast(editing.isNew ? "أُضيف السجل" : "حُفظت التعديلات");
    setEditing(null);
    void load();
  };

  const remove = async (r: Row) => {
    if (!supabase) return;
    const { error: err } = await supabase.from(config.table).delete().match(keyFilter(r));
    if (err) toast(arabicDbError(err.message), "error");
    else {
      toast("حُذف السجل");
      void load();
    }
  };

  if (editing) {
    const d = editing.draft;
    const set = (name: string, value: unknown) => setEditing({ ...editing, draft: { ...d, [name]: value } });
    return (
      <Card>
        <h2 className="mb-4 text-lg font-bold">{editing.isNew ? `إضافة إلى ${config.title}` : "تعديل"}</h2>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          {config.fields.map((f) => {
            const disabled = f.createOnly && !editing.isNew;
            if (f.type === "checkbox") {
              return (
                <label key={f.name} className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={!!d[f.name]} onChange={(e) => set(f.name, e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
                  {f.label}
                </label>
              );
            }
            return (
              <div key={f.name}>
                <Field label={`${f.label}${f.required ? " *" : ""}`} hint={f.hint}>
                  {(id, desc) =>
                    f.type === "textarea" || f.type === "list" || f.type === "quranRefs" ? (
                      <Textarea id={id} aria-describedby={desc} rows={f.rows ?? 4} value={String(d[f.name] ?? "")} onChange={(e) => set(f.name, e.target.value)} dir={f.type === "quranRefs" ? "ltr" : undefined} />
                    ) : f.type === "select" ? (
                      <Select id={id} aria-describedby={desc} value={String(d[f.name] ?? "")} onChange={(e) => set(f.name, e.target.value)} disabled={disabled}>
                        {!f.required && <option value="">—</option>}
                        {f.options?.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        id={id}
                        aria-describedby={desc}
                        type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                        value={String(d[f.name] ?? "")}
                        disabled={disabled}
                        dir={f.name === "id" ? "ltr" : undefined}
                        onChange={(e) => set(f.name, e.target.value)}
                      />
                    )
                  }
                </Field>
                {f.preview && <div className="mt-2">{f.preview(d)}</div>}
              </div>
            );
          })}
          {formError && (
            <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
              {formError}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "جارٍ الحفظ…" : "حفظ"}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              إلغاء
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setEditing({ draft: toDraft(config.fields, config.defaults), isNew: true })}>
          <Plus className="h-5 w-5" aria-hidden="true" />
          إضافة
        </Button>
        {config.filter && (
          <Select aria-label={config.filter.label} value={filter} onChange={(e) => setFilter(e.target.value)} className="w-auto">
            <option value="">{config.filter.label}: الكل</option>
            {config.filter.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        )}
        <Input aria-label="بحث" placeholder="بحث…" value={q} onChange={(e) => setQ(e.target.value)} className="w-auto flex-1" />
      </div>
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows === null ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <EmptyState title="لا توجد سجلات" />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {visible.map((r) => (
              <li key={config.keys.map((k) => String(r[k])).join("/")} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{config.rowTitle(r)}</div>
                  {config.rowMeta && <div className="mt-0.5 text-xs text-muted">{config.rowMeta(r)}</div>}
                </div>
                {"active" in r && !r.active && <Badge>موقوف</Badge>}
                <button
                  type="button"
                  onClick={() => setEditing({ draft: toDraft(config.fields, r), isNew: false, original: r })}
                  className="rounded-full p-2 text-muted hover:bg-surface-2 focus-ring"
                  aria-label="تعديل"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setToDelete(r)} className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-danger focus-ring" aria-label="حذف">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <p className="text-xs text-muted">{rows ? `${visible.length} من ${rows.length} سجل` : ""}</p>
      <ConfirmDialog
        open={!!toDelete}
        danger
        title="تأكيد الحذف"
        message="سيُحذف هذا السجل نهائيًا. يمكنك بدلًا من ذلك إيقافه مؤقتًا من التعديل."
        confirmLabel="حذف"
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && void remove(toDelete)}
      />
    </div>
  );
}
