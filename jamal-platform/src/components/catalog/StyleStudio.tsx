"use client";

import { useState } from "react";
import { Camera, Sparkles } from "lucide-react";
import { ProductGrid } from "@/components/product/ProductCard";
import type { ProductCard } from "@/lib/data/catalog";
import { matchCatalog, palettes, type Occasion } from "@/lib/style-studio";

const inputClass = "w-full rounded-xl border border-line bg-paper px-3 py-3 text-sm";
export function StyleStudio({ items }: { items: ProductCard[] }) {
 const [budget, setBudget] = useState(500);
 const [category, setCategory] = useState("");
 const [occasion, setOccasion] = useState<Occasion>("daily");
 const [color, setColor] = useState("");
 const [error, setError] = useState("");
 const [busy, setBusy] = useState(false);
 const currencies = Array.from(new Set(items.map(p => p.currency_code)));
 const [currency, setCurrency] = useState(currencies.includes("ILS") ? "ILS" : currencies[0] ?? "ILS");
 const categories = Array.from(new Map(items.filter(p => p.category_slug).map(p => [p.category_slug!, p.category_name ?? p.category_slug!])).entries());
 const results = matchCatalog(items, { budget, category, occasion, color, currency });
 async function analyze(file?: File) {
  if (!file) return;
  setError("");
  if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) { setError("اختر صورة بحجم أقل من 8 ميجابايت."); return; }
  setBusy(true);
  try {
   const bitmap = await createImageBitmap(file);
   try {
    const canvas = document.createElement("canvas"); canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("canvas");
    const w = bitmap.width, h = bitmap.height;
    ctx.drawImage(bitmap, w/4, h/4, w/2, h/2, 0, 0, 32, 32);
    const data = ctx.getImageData(0, 0, 32, 32).data;
    const buckets = new Map<string, { count: number; sum: number[] }>();
    for (let i=0;i<data.length;i+=4) {
     if (data[i+3] < 128) continue;
     const pixel = [data[i],data[i+1],data[i+2]];
     const key = pixel.map(n => Math.floor(n/32)).join(",");
     const b = buckets.get(key) ?? {count:0,sum:[0,0,0]};
     b.count++; pixel.forEach((n,j)=>{b.sum[j]+=n;}); buckets.set(key,b);
    }
    const best = [...buckets.values()].sort((a,b)=>b.count-a.count)[0];
    if (!best) throw new Error("empty");
    setColor("#"+best.sum.map(n=>Math.round(n/best.count).toString(16).padStart(2,"0")).join(""));
   } finally { bitmap.close(); }
  } catch { setError("تعذر قراءة الصورة. جرّب صورة JPEG أو PNG واضحة."); }
  finally { setBusy(false); }
 }
 return <div className="container-page pb-16">
  <section className="jamal-card rounded-[2rem] p-5 md:p-8">
   <div className="mb-5 flex items-center gap-3"><Sparkles className="size-6 text-beige-deep"/><h2 className="text-lg font-bold">اختياراتك، بأسلوبك</h2></div>
   <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <label className="space-y-2 text-sm font-semibold">المناسبة<select className={inputClass} value={occasion} onChange={e=>setOccasion(e.target.value as Occasion)}><option value="daily">يومي</option><option value="work">عمل ودراسة</option><option value="event">مناسبة</option></select></label>
    <label className="space-y-2 text-sm font-semibold">الفئة<select className={inputClass} value={category} onChange={e=>setCategory(e.target.value)}><option value="">كل الفئات</option>{categories.map(([slug,name])=><option key={slug} value={slug}>{name}</option>)}</select></label>
    <label className="space-y-2 text-sm font-semibold">العملة<select className={inputClass} value={currency} onChange={e=>setCurrency(e.target.value)}>{(currencies.length?currencies:["ILS"]).map(c=><option key={c}>{c}</option>)}</select></label>
    <label className="space-y-2 text-sm font-semibold">أقصى سعر للقطعة<input type="number" min={0} max={100000} className={inputClass} value={budget} onChange={e=>setBudget(Math.max(0,Math.min(100000,Number(e.target.value)||0)))}/></label>
   </div>
   <fieldset className="mt-6"><legend className="mb-3 text-sm font-bold">اللون المفضل</legend><div className="flex flex-wrap gap-3">{palettes.map(p=><button type="button" key={p.hex} aria-label={p.name} aria-pressed={color===p.hex} className="rounded-full border border-line p-1 aria-pressed:ring-2 aria-pressed:ring-ink" onClick={()=>setColor(p.hex)}><span className="block size-9 rounded-full border border-line" style={{backgroundColor:p.hex}}/></button>)}<button type="button" className="rounded-full border border-line px-4 text-sm" onClick={()=>setColor("")}>أي لون</button></div></fieldset>
   <div className="mt-6 rounded-2xl border border-line bg-ivory p-4">
    <label className="flex flex-wrap items-center gap-2 text-sm font-bold"><Camera className="size-5"/> ابحث عن لون من صورة<input aria-label="اختر صورة لتحليل اللون" type="file" accept="image/*" className="block w-full min-w-0 max-w-full text-xs" disabled={busy} onChange={e=>void analyze(e.target.files?.[0])}/></label>
    <p className="mt-2 text-xs leading-6 text-muted">نحلل اللون الغالب في وسط الصورة على جهازك فقط. لا تُرفع الصورة ولا نتعرف على نوع القطعة أو هوية الأشخاص.</p>
    {color && <p className="mt-2 flex items-center gap-2 text-xs"><span className="size-5 rounded-full border border-line" style={{backgroundColor:color}}/> اللون المختار <span dir="ltr">{color}</span></p>}
    <p role="status" className="text-xs text-danger">{busy?"جارٍ قراءة اللون…":error}</p>
   </div>
  </section>
  <div className="my-7 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">قطع مقترحة</h2><p aria-live="polite" className="text-sm text-muted">{results.length} نتيجة</p></div>
  {results.length?<ProductGrid products={results}/>:<div className="rounded-2xl border border-line bg-paper p-8 text-center text-sm text-muted">لا توجد قطع مطابقة للميزانية والفئة. جرّب تعديل الخيارات.</div>}
  <p className="mt-6 text-xs text-muted">اقتراحات محلية مبنية على اللون والسعر والفئة، وليست توصية من نموذج ذكاء اصطناعي. النتائج من أحدث 60 منتجًا منشورًا.</p>
 </div>;
}
