/** Arabic labels for database enums. */
export const MEETING_MODE: Record<string, string> = { in_person: "حضوري", remote: "عن بُعد", hybrid: "مختلط" };
export const LEVEL: Record<string, string> = { beginner: "مبتدئ", intermediate: "متوسط", advanced: "متقدم", all: "كل المستويات" };
export const AUDIENCE: Record<string, string> = { male: "بنين / رجال", female: "بنات / نساء", mixed: "للجميع" };
export const HALAQA_STATUS: Record<string, string> = { draft: "مسودة", published: "منشورة", completed: "مكتملة", paused: "متوقفة" };
export const JOIN_POLICY: Record<string, string> = { open: "انضمام مباشر", approval: "بموافقة المحفّظ", invite_only: "بالدعوة فقط" };
export const MEMBERSHIP_STATUS: Record<string, string> = { pending: "قيد المراجعة", active: "نشطة", rejected: "مرفوضة", removed: "منتهية", left: "انسحبت" };
export const SESSION_STATUS: Record<string, string> = { scheduled: "مجدولة", completed: "منعقدة", cancelled: "ملغاة" };
export const ATTENDANCE: Record<string, string> = { present: "حاضر", late: "متأخر", absent: "غائب", excused: "غياب بعذر" };
export const ACTIVITY: Record<string, string> = { new_memorization: "حفظ جديد", near_review: "مراجعة قريبة", far_review: "مراجعة بعيدة" };
export const COMPLETION: Record<string, string> = { completed: "مكتمل", partial: "جزئي", not_completed: "لم يُنجز" };
export const ADHERENCE: Record<string, string> = { met: "ملتزم بالخطة", partial: "التزام جزئي", missed: "لم يلتزم", no_plan: "دون خطة" };
export const ERROR_TYPE: Record<string, string> = {
  memorization: "خطأ حفظ / نسيان",
  tajweed: "تجويد",
  pronunciation: "مخارج ونطق",
  waqf_ibtida: "وقف وابتداء",
  hesitation: "تردد",
  other: "أخرى",
};
export const ASSIGNMENT_STATUS: Record<string, string> = {
  assigned: "مطلوب",
  completed: "أُنجز",
  partially_completed: "أُنجز جزئيًا",
  missed: "لم يُنجز",
  cancelled: "ملغى",
};
export const INSTITUTION_STATUS: Record<string, string> = { pending: "بانتظار التوثيق", verified: "موثّق", suspended: "موقوف" };
export const RELATIONSHIP: Record<string, string> = { father: "الأب", mother: "الأم", guardian: "وصي", other: "أخرى" };
export const WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
export const SCORE_LABELS: Record<number, string> = { 1: "ضعيف", 2: "مقبول", 3: "جيد", 4: "جيد جدًا", 5: "ممتاز" };
export const CERTIFICATE_KIND: Record<string, string> = {
  juz_completion: "إتمام حفظ جزء",
  surah_completion: "إتمام حفظ سورة",
  khatm: "ختم القرآن الكريم",
  attendance: "الانتظام والحضور",
  other: "إنجاز",
};
export const TICKET_CATEGORY: Record<string, string> = {
  report_abuse: "إبلاغ عن محتوى أو سلوك",
  technical: "مشكلة تقنية",
  privacy: "الخصوصية والبيانات",
  suggestion: "اقتراح",
  other: "أخرى",
};
export const TICKET_STATUS: Record<string, string> = { open: "مفتوح", in_progress: "قيد المعالجة", resolved: "تم الحل", closed: "مغلق" };
export const REVIEW_STATUS: Record<string, string> = { pending: "قيد المراجعة", approved: "مقبول", rejected: "مرفوض" };
