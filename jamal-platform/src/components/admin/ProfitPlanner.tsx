"use client";
import { useState } from "react";
import { formatMoney } from "@/lib/money";
export function ProfitPlanner(){
 const [price,setPrice]=useState(0),[cost,setCost]=useState(0),[shipping,setShipping]=useState(0),[orders,setOrders]=useState(0),[overhead,setOverhead]=useState(0);
 const fields=[{label:"سعر البيع للطلب",v:price,set:setPrice},{label:"تكلفة المنتجات",v:cost,set:setCost},{label:"تكلفة التوصيل والرسوم عليك",v:shipping,set:setShipping},{label:"عدد الطلبات المسلّمة المتوقع",v:orders,set:setOrders},{label:"مصروفات التشغيل الشهرية",v:overhead,set:setOverhead}];
 const net=(price-cost-shipping)*orders-overhead;
 return <div className="space-y-4">
  <p className="text-xs leading-6 text-muted">محاكاة بالشيكل لقيم تدخلها بنفسك، وليست مبيعات حقيقية أو تنبؤًا آليًا. ضع صافي سعر البيع بعد الخصومات.</p>
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{fields.map(f=><label key={f.label} className="text-xs font-semibold">{f.label}<input type="number" min={0} max={1000000} className="mt-2 block w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm" value={f.v} onChange={e=>f.set(Math.max(0,Math.min(1000000,Number(e.target.value)||0)))}/></label>)}</div>
  <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-ivory p-4"><div><dt className="text-xs text-muted">إيراد افتراضي</dt><dd className="font-bold">{formatMoney(price*orders,"ILS")}</dd></div><div><dt className="text-xs text-muted">صافي الربح الافتراضي</dt><dd className={net<0?"font-bold text-danger":"font-bold text-success"}>{formatMoney(net,"ILS")}</dd></div></dl>
 </div>;
}
