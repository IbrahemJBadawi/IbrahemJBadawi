import Link from "next/link";
import { Suspense } from "react";
import { getStoreSettings } from "@/lib/data/catalog";
import { Monogram } from "@/components/ui/Logo";
import { assistantAvailable } from "@/lib/ai/availability";

async function AssistantLink() {
  if (!(await assistantAvailable())) return null;
  return <li><Link className="hover:text-ivory" href="/assistant">مساعد التسوق الذكي</Link></li>;
}

async function Contact() {
  const s = await getStoreSettings();
  if (!s) return null;
  return (
    <ul className="space-y-2 text-sm text-ivory/70">
      {s.contact_email && <li><a className="ltr hover:text-ivory" href={`mailto:${s.contact_email}`}>{s.contact_email}</a></li>}
      {s.contact_phone && <li><a className="ltr hover:text-ivory" href={`tel:${s.contact_phone.replace(/\s/g, "")}`}>{s.contact_phone}</a></li>}
      {s.whatsapp && (
        <li>
          <a className="hover:text-ivory" href={`https://wa.me/${s.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">
            واتساب
          </a>
        </li>
      )}
      <li><Link className="hover:text-ivory" href="/contact">نموذج التواصل</Link></li>
    </ul>
  );
}

export function Footer() {
  const col = "space-y-2 text-sm text-ivory/70";
  return (
    <footer className="mt-auto bg-ink text-ivory print:hidden">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3" dir="ltr"><Monogram variant="outline-light" className="w-9" /><p className="font-display text-2xl tracking-[0.3em]">AL JAMAL <span className="text-sm tracking-[0.4em] text-beige">STORE</span></p></div>
          <p className="mt-1 text-xs tracking-[0.2em] text-beige">متجر الجمال</p>
          <p className="mt-4 max-w-xs text-sm leading-7 text-ivory/70">
            قطع يومية مختارة من موردين محليين في فلسطين. اطلب الآن وادفع بعد تثبيت طلبك.
          </p>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-bold">تسوّق</h2>
          <ul className={col}>
            <li><Link className="hover:text-ivory" href="/products">جميع المنتجات</Link></li>
            <li><Link className="hover:text-ivory" href="/offers">العروض والتخفيضات</Link></li>
            <li><Link className="hover:text-ivory" href="/favorites">المفضلة</Link></li>
            <li><Link className="hover:text-ivory" href="/track">تتبع الطلب</Link></li>
            <li><Link className="hover:text-ivory" href="/app">تطبيق الهاتف</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-bold">المساعدة والسياسات</h2>
          <ul className={col}>
            <li><Link className="hover:text-ivory" href="/support">الدعم وتذاكر خدمة العملاء</Link></li>
            <li><Link className="font-semibold text-beige hover:text-ivory" href="/suppliers/join">انضم كمورد</Link></li>
            <Suspense fallback={null}><AssistantLink /></Suspense>
            <li><Link className="hover:text-ivory" href="/faq">الأسئلة الشائعة</Link></li>
            <li><Link className="hover:text-ivory" href="/policies/shipping">سياسة التوصيل</Link></li>
            <li><Link className="hover:text-ivory" href="/policies/returns">الاستبدال والإرجاع</Link></li>
            <li><Link className="hover:text-ivory" href="/policies/privacy">الخصوصية</Link></li>
            <li><Link className="hover:text-ivory" href="/policies/terms">الشروط والأحكام</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-bold">تواصل معنا</h2>
          <Suspense fallback={null}>
            <Contact />
          </Suspense>
        </div>
      </div>
      <div className="border-t border-ivory/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-ivory/50 sm:flex-row sm:justify-between">
          <p>© Al JAMAL Store | متجر الجمال</p>
          <p>الدفع آمن عبر بنك فلسطين — ولا نطلب بيانات بطاقات أبدًا.</p>
        </div>
      </div>
    </footer>
  );
}
