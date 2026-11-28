"use client";
import { useState } from "react";
import { recommendedSize } from "@/lib/style-studio";
export function SizeGuide({variants}: {variants: {size:string|null;availability:string}[]}) {
 const [usual,setUsual]=useState("");
 const sizes=Array.from(new Set(variants.map(v=>v.size).filter((s): s is string=>!!s)));
 if(!sizes.length) return null;
 const result=recommendedSize(usual,variants);
 return <details className="rounded-2xl border border-line bg-paper px-4 py-3">
  <summary className="cursor-pointer text-sm font-bold">مساعد اختيار المقاس</summary>
  <label className="mt-3 block text-xs text-muted">ما المقاس الذي ترتديه عادة في هذا النوع؟
   <input className="mt-2 block w-full rounded-xl border border-line px-3 py-2 text-sm" value={usual} onChange={e=>setUsual(e.target.value)} placeholder="مثلاً M أو 42" maxLength={12}/>
  </label>
  <p className="mt-3 text-xs leading-6" aria-live="polite">{usual.trim() ? result ? "المقاس "+result+" متوفر ضمن بعض خيارات المنتج. تحقق من اللون قبل الإضافة." : "لم نجد مقاسًا مطابقًا متوفرًا. تواصل مع الدعم قبل اختيار بديل." : "المقاسات المسجلة: "+sizes.join("، ")}</p>
  <p className="mt-1 text-xs text-muted">هذا تطابق للمقاس المعتاد فقط، وليس تقديرًا للقياسات الجسدية؛ المقاسات تختلف بين الموردين.</p>
 </details>;
}
