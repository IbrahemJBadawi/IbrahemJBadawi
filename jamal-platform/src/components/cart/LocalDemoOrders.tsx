"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HardDrive, Trash2, ShoppingBag } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { readBrowserDemoOrders, removeBrowserDemoOrder, type BrowserDemoOrder } from "@/lib/demo/browser-store";
import { ButtonLink } from "@/components/ui/Button";
import { Notice, Skeleton } from "@/components/ui/States";

export function LocalDemoOrders() {
  const [orders, setOrders] = useState<BrowserDemoOrder[] | null>(null);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => { setOrders(readBrowserDemoOrders()); }, []);

  function remove(id: string) {
    if (!window.confirm("حذف هذا الطلب التجريبي من هذا المتصفح؟")) return;
    if (removeBrowserDemoOrder(id)) setOrders(readBrowserDemoOrders());
    else setStorageError(true);
  }

  if (orders === null) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-6">
      <Notice tone="warning">
        <span className="flex items-start gap-2"><HardDrive className="mt-1 size-4 shrink-0" />
          هذه الطلبات محفوظة محليًا في هذا المتصفح فقط، ولا تظهر للإدارة أو لأي مستخدم آخر. لا توجد شحنات أو مدفوعات حقيقية.
        </span>
      </Notice>
      {storageError && <Notice tone="error">فشل تعديل البيانات المحلية. تحقق من صلاحيات التخزين في المتصفح.</Notice>}
      {orders.length === 0 ? (
        <div className="space-y-4 rounded-[var(--radius-card)] border border-line bg-paper p-8 text-center">
          <ShoppingBag className="mx-auto size-9 text-muted" />
          <p className="font-semibold">لا توجد طلبات تجريبية محفوظة بعد.</p>
          <ButtonLink href="/products">تصفح المنتجات</ButtonLink>
        </div>
      ) : orders.map((order) => (
        <article key={order.id} className="rounded-[var(--radius-card)] border border-line bg-paper p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-beige-deep">محفوظ على هذا الجهاز — ليس طلبًا حقيقيًا</p>
              <h2 className="mt-1 font-bold">{order.label}</h2>
              <p className="mt-1 text-xs text-muted" dir="ltr">{order.id}</p>
              <p className="mt-1 text-xs text-muted">{new Date(order.createdAt).toLocaleString("ar-PS")}</p>
            </div>
            <button type="button" onClick={() => remove(order.id)}
              className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-2 text-xs text-danger">
              <Trash2 className="size-4" /> حذف
            </button>
          </div>
          <ul className="mt-4 divide-y divide-line text-sm">
            {order.lines.map((line, index) => (
              <li key={index} className="flex justify-between gap-3 py-2">
                <span>{line.name} {line.variant ? `— ${line.variant}` : ""} × {line.quantity}</span>
                <span className="shrink-0">{formatMoney(line.lineTotal, order.currency)}</span>
              </li>
            ))}
          </ul>
          {order.note && <p className="mt-3 text-xs leading-6 text-muted">{order.note}</p>}
          <div className="mt-3 flex justify-between border-t border-line pt-3 font-bold">
            <span>المجموع التجريبي</span><span>{formatMoney(order.subtotal, order.currency)}</span>
          </div>
        </article>
      ))}
      <p className="text-sm"><Link href="/products" className="font-semibold underline">العودة للمتجر</Link></p>
    </div>
  );
}
