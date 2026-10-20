import Link from "next/link";

// Auth-gated: rendering waits for the session.
export const instant = false;

const LINKS = [
  { href: "/supplier", label: "الرئيسية" },
  { href: "/supplier/products", label: "منتجاتي" },
  { href: "/supplier/products/new", label: "+ منتج جديد" },
  { href: "/supplier/orders", label: "الطلبات" },
  { href: "/supplier/profile", label: "بيانات المتجر" },
];

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page py-6 md:py-10">
      <p className="eyebrow mb-3">لوحة المورد</p>
      <nav aria-label="لوحة المورد" className="mb-6">
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 text-sm [scrollbar-width:none]">
          {LINKS.map((l) => (
            <li key={l.href}><Link href={l.href} className="block whitespace-nowrap rounded-full border border-line bg-paper px-4 py-2 hover:bg-sand">{l.label}</Link></li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
