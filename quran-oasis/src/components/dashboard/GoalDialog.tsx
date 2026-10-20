"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input, Segmented, Switch } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";
import { updateSettings } from "@/lib/store/actions";
import { getState } from "@/lib/store/store";
import type { GoalUnit } from "@/lib/store/types";

const PRESETS: Record<GoalUnit, number[]> = { pages: [1, 2, 5, 10, 20], ayahs: [5, 10, 20, 50] };

export function GoalDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [enabled, setEnabled] = useState(true);
  const [unit, setUnit] = useState<GoalUnit>("pages");
  const [amount, setAmount] = useState("2");

  useEffect(() => {
    if (!open) return;
    const g = getState().settings.dailyGoal;
    setEnabled(g.enabled);
    setUnit(g.unit);
    setAmount(String(g.amount));
  }, [open]);

  const n = Number(amount);
  const max = unit === "pages" ? 604 : 6236;
  const valid = Number.isFinite(n) && n >= 1 && n <= max;

  return (
    <Dialog open={open} onClose={onClose} title="الهدف اليومي للقراءة">
      <div className="space-y-4">
        <Switch checked={enabled} onChange={setEnabled} label="تفعيل الهدف اليومي" description="يمكنك إيقافه في أي وقت دون أن يؤثر على تقدمك" />
        <div className={enabled ? "" : "pointer-events-none opacity-50"}>
          <div className="mb-3">
            <Segmented
              label="وحدة الهدف"
              value={unit}
              onChange={(u) => {
                setUnit(u);
                setAmount(String(PRESETS[u][1]));
              }}
              options={[
                { value: "pages", label: "صفحات" },
                { value: "ayahs", label: "آيات" },
              ]}
            />
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {PRESETS[unit].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(String(p))}
                className={`h-9 rounded-full px-4 text-sm font-semibold focus-ring ${Number(amount) === p ? "bg-primary text-primary-fg" : "bg-surface-2"}`}
              >
                {p}
              </button>
            ))}
          </div>
          <Field label={unit === "pages" ? "عدد الصفحات يوميًا" : "عدد الآيات يوميًا"} hint={unit === "pages" ? "الصفحة بحسب مصحف المدينة (604 صفحة). الجزء ≈ 20 صفحة." : undefined} error={!valid ? `أدخل رقمًا بين 1 و${max}` : null}>
            {(id, d) => <Input id={id} aria-describedby={d} type="number" inputMode="numeric" min={1} max={max} value={amount} onChange={(e) => setAmount(e.target.value)} />}
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            disabled={enabled && !valid}
            onClick={() => {
              updateSettings({ dailyGoal: { enabled, unit, amount: valid ? Math.round(n) : getState().settings.dailyGoal.amount } });
              toast("حُفظ هدفك اليومي");
              onClose();
            }}
          >
            حفظ
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
