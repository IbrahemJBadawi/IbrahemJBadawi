/** Arabic labels shared by pages. English can be added next to these keys. */
export const ROLE_LABEL = { owner: "المالك", admin: "مدير", agent: "موظف مبيعات", viewer: "مشاهدة فقط" } as const;
export const ROLE_HINT = {
  owner: "كل الصلاحيات، بما فيها الاشتراك وحذف الشركة",
  admin: "يدير الفريق والنماذج والمواعيد والإعدادات",
  agent: "يعمل على العملاء والمتابعة والمواعيد",
  viewer: "يطّلع على البيانات دون تعديل",
} as const;

export const CATEGORY_LABEL = {
  new: "جديد",
  working: "قيد التواصل",
  qualified: "مؤهل",
  booked: "موعد محجوز",
  won: "تحوّل إلى عميل",
  lost: "غير مؤهل",
} as const;
export type StageCategory = keyof typeof CATEGORY_LABEL;

/** Tone per stage category (CSS class suffix). */
export const CATEGORY_TONE: Record<StageCategory, "blue" | "amber" | "violet" | "sky" | "green" | "gray"> = {
  new: "blue",
  working: "amber",
  qualified: "violet",
  booked: "sky",
  won: "green",
  lost: "gray",
};

export const APPOINTMENT_STATUS = {
  booked: "محجوز",
  confirmed: "مؤكد",
  completed: "منعقد",
  canceled: "ملغى",
  no_show: "لم يحضر",
} as const;
export type AppointmentStatus = keyof typeof APPOINTMENT_STATUS;
export const APPOINTMENT_TONE: Record<AppointmentStatus, "blue" | "green" | "gray" | "red" | "sky"> = {
  booked: "blue",
  confirmed: "sky",
  completed: "green",
  canceled: "gray",
  no_show: "red",
};

export const ACTIVITY_LABEL: Record<string, string> = {
  note: "ملاحظة",
  call: "مكالمة",
  whatsapp: "واتساب",
  email: "بريد",
  meeting: "لقاء",
  created: "إنشاء السجل",
  stage_change: "تغيير المرحلة",
  submission: "إرسال نموذج",
  appointment: "موعد",
  system: "النظام",
};

export const SOURCE_LABEL: Record<string, string> = {
  manual: "إدخال يدوي",
  form: "نموذج",
  booking: "صفحة الحجز",
  phone: "اتصال هاتفي",
  whatsapp: "واتساب",
  walk_in: "زيارة مباشرة",
  referral: "توصية",
  instagram: "إنستغرام",
  facebook: "فيسبوك",
  tiktok: "تيك توك",
  google: "Google",
  event: "فعالية",
  snapchat: "سناب شات",
  x: "X",
  other: "أخرى",
};
export const sourceLabel = (s: string) => SOURCE_LABEL[s] ?? s;

export const BILLING_STATUS = { pending: "قيد المراجعة", verified: "مؤكَّد", rejected: "مرفوض" } as const;
export const BILLING_METHOD = { bank_transfer: "تحويل بنكي", cash: "نقدًا", other: "أخرى" } as const;
export const SUB_STATUS = { trialing: "فترة تجريبية", active: "فعّال", past_due: "متأخر السداد", canceled: "ملغى" } as const;

export const PLAN_NAME: Record<string, string> = { free: "Free — مجاني", starter: "Starter", growth: "Growth" };
