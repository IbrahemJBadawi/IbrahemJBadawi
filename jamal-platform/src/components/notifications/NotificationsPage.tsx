import { requireUser } from "@/lib/auth";
import { listNotifications, notificationPrefs } from "@/lib/data/notifications";
import { markAllReadAction, savePreferencesAction } from "@/lib/actions/notifications";
import { ActionForm } from "@/components/forms/ActionForm";
import { NotificationList } from "./NotificationList";
import { PushToggle } from "@/components/pwa/Engage";

export async function NotificationsPage({ next }: { next: string }) {
  const user = await requireUser(next);
  const [items, prefs] = await Promise.all([listNotifications(user), notificationPrefs(user)]);
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">الإشعارات</h1>
        {items.some((n) => !n.is_read) && <ActionForm action={markAllReadAction} submitLabel="تعليم الكل كمقروء" size="sm" variant="secondary" className="" />}
      </div>
      <section className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
        <h2 className="mb-1 text-base font-bold">إشعارات الهاتف</h2>
        <p className="mb-3 text-xs leading-6 text-muted">تصلك على هذا الجهاز حتى لو كان الموقع مغلقًا. فعّلها على كل جهاز تستخدمه.</p>
        <PushToggle />
      </section>
      <NotificationList items={items} />
      <section>
        <h2 className="mb-1 text-base font-bold">تفضيلات الإشعارات</h2>
        <p className="mb-4 text-xs leading-6 text-muted">رسائل البريد تُرسل فقط بعد ربط مزود بريد إلكتروني بالمنصة؛ حتى ذلك الحين تبقى في الطابور.</p>
        <ActionForm action={savePreferencesAction} submitLabel="حفظ التفضيلات" className="space-y-3">
          <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-paper">
            {prefs.map((p) => (
              <li key={p.kind} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <input type="hidden" name="kind" value={p.kind} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{p.title_ar}</span>
                  {p.detail_ar && <span className="block text-xs text-muted">{p.detail_ar}</span>}
                </span>
                <span className="flex gap-4 text-sm">
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" name={`in_app:${p.kind}`} defaultChecked={p.in_app || p.is_mandatory} disabled={p.is_mandatory} className="accent-ink" />
                    داخل المنصة
                    {p.is_mandatory && <input type="hidden" name={`in_app:${p.kind}`} value="on" />}
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" name={`email:${p.kind}`} defaultChecked={p.email} className="accent-ink" /> بريد
                  </label>
                </span>
              </li>
            ))}
          </ul>
        </ActionForm>
      </section>
    </div>
  );
}
