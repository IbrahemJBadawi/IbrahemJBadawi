/**
 * Arabic UI dictionary. The structure is ready for an `en.ts` sibling:
 * add the file with the same keys and pick the dictionary by locale.
 */
export const ar = {
  brand: { name: "منصة الجمال", latin: "JAMAL", tagline: "أزياء معاصرة بلمسة هادئة" },
  nav: {
    home: "الرئيسية",
    all: "جميع المنتجات",
    offers: "العروض والتخفيضات",
    search: "البحث",
    favorites: "المفضلة",
    cart: "السلة",
    account: "حسابي",
    orders: "طلباتي",
    login: "تسجيل الدخول",
    register: "إنشاء حساب",
    logout: "تسجيل الخروج",
    contact: "اتصل بنا",
    faq: "الأسئلة الشائعة",
    track: "تتبع الطلب",
    admin: "لوحة الإدارة",
    menu: "القائمة",
  },
  availability: {
    available: "متوفر",
    out_of_stock: "غير متوفر حاليًا",
    discontinued: "متوقف",
  },
  productStatus: { draft: "مسودة", published: "منشور", hidden: "مخفي" },
  orderStatus: {
    pending: "قيد المراجعة",
    confirmed: "مؤكد",
    processing: "قيد التجهيز",
    shipped: "تم الشحن",
    delivered: "تم التسليم",
    cancelled: "ملغي",
    returned: "مرتجع",
  },
  paymentStatus: {
    unpaid: "غير مدفوع",
    paid: "مدفوع",
    refunded: "مسترد",
    partially_refunded: "مسترد جزئيًا",
  },
  paymentMethod: {
    cod: "الدفع عند الاستلام",
    manual: "طلب يدوي — نتواصل معك لتأكيد الطلب وطريقة الدفع",
  },
  fulfillmentStatus: {
    pending: "لم يُرسل للمورد",
    sent_to_supplier: "أُرسل للمورد",
    confirmed: "أكده المورد",
    shipped: "شُحن",
    delivered: "سُلّم",
    cancelled: "ملغي",
    failed: "تعذّر التنفيذ",
  },
  returnStatus: {
    requested: "تم الطلب",
    approved: "مقبول",
    rejected: "مرفوض",
    received: "تم الاستلام",
    refunded: "تم الاسترداد",
  },
  sort: {
    newest: "الأحدث",
    price_asc: "السعر: من الأقل",
    price_desc: "السعر: من الأعلى",
    name: "الاسم",
  },
} as const;

export type Dictionary = typeof ar;
export const t = ar;

export function label<T extends Record<string, string>>(map: T, key: string | null | undefined): string {
  if (!key) return "";
  return (map as Record<string, string>)[key] ?? key;
}
