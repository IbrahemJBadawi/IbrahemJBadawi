# دليل تحديث المحتوى (من الهاتف عبر GitHub)

كل المحتوى في ملفات بيانات؛ لا حاجة لتعديل الصفحات. من الهاتف:
1. افتح المستودع في تطبيق GitHub أو github.com.
2. اذهب إلى الملف (المسارات أدناه) ← أيقونة القلم ✏️.
3. عدّل النص، ثم **Commit changes**. ينشر Vercel التحديث خلال دقائق.

> كل نص له نسختان: `ar` و`en`. اكتب الاثنتين دائمًا. حافظ على علامات التنصيص والفواصل.

| ماذا تريد؟ | الملف |
|---|---|
| إضافة مشروع أو تغيير حالته أو رابطه | `techmood-company/src/data/ventures.ts` |
| تعديل خدمة أو إضافة خدمة | `techmood-company/src/data/services.ts` |
| الحلول حسب الفئة | `techmood-company/src/data/solutions.ts` |
| خبر جديد (يظهر في الجرس ويُرسل إشعارًا) | `techmood-company/src/data/updates.ts` |
| البريد وروابط Telegram والحسابات | `techmood-company/src/config/company.ts` |
| عناصر القائمة | `techmood-company/src/config/nav.ts` |

## حالة المشروع
- `live` متاح للجميع · `beta` منشور وتجريبي · `in-development` قيد البناء · `planned` فكرة في التخطيط.
- أضف `url` **فقط** إذا كان المنتج منشورًا ورابطه يعمل، ومع حالة `live` أو `beta`. الاختبارات ترفض غير ذلك.
- عند تغيير حالة مشروع، يصل إشعار لمن يتابعه (إن فعّل الإشعارات) عند فتحه الموقع.
- اكتب في `evidence` مصدر الحالة (لا يظهر للزوار).

## خبر جديد
أضف عنصرًا **في أول** `UPDATES` بمعرّف `id` جديد غير مكرر، وتاريخ `YYYY-MM-DD`، ومسار داخل الموقع (`/ventures/halaqati` مثلًا). الأخبار مرتبة من الأحدث.

## مثال: مشروع جديد
```ts
{
  slug: "new-project",            // يظهر في الرابط: /ventures/new-project
  name: { ar: "اسم المشروع", en: "Project name" },
  status: "in-development",
  field: { ar: "المجال", en: "Field" },
  tagline: { ar: "سطر تعريفي", en: "One-line description" },
  audience: { ar: ["فئة"], en: ["Audience"] },
  problem: { ar: "…", en: "…" },
  solution: { ar: "…", en: "…" },
  scope: { ar: ["…"], en: ["…"] },
  evidence: "where the status comes from",
},
```
ولون أيقونته وحرفها في `src/components/Blocks.tsx` (`MARK_COLORS` و`MARK_INITIALS`)، وإلا يُستخدم الافتراضي.

## قواعد المحتوى
- لا أرقام مستخدمين أو عملاء أو جوائز أو شراكات غير مؤكدة.
- لا أسعار ولا ضمانات نتائج.
- لا تضع مفاتيح أو كلمات مرور في أي ملف — مكانها متغيرات Vercel.
