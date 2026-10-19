# TechMood Technology — الموقع الرسمي للشركة الأم

**Building Future Digital Leaders** · AI-Powered Technology Ecosystem for the Future of Work

موقع ثنائي اللغة (العربية افتراضيًا RTL، والإنجليزية LTR في `/en`) يعرض الشركة وخدماتها ومشاريعها بحالتها الفعلية، ويعمل كتطبيق قابل للتثبيت.

## الصفحات
`/` الرئيسية · `/about` الشركة · `/services` و`/services/[slug]` (7 خدمات) · `/ventures` و`/ventures/[slug]` (5 مشاريع) · `/solutions` · `/contact` · `/app` التطبيق والإعدادات · `/privacy` · `/terms` · 404 مخصصة. الإنجليزية بنفس المسارات بعد `/en`.

## المزايا
- **تثبيت كتطبيق (PWA)** مع بطاقة تثبيت، وصفحات تعمل دون اتصال بعد زيارتها، وصفحة offline.
- **إشعارات الجهاز** للمستجدات ولتغيّر حالة المشاريع التي يتابعها الزائر — بلا خادم ولا جمع بيانات.
- **التخزين المحلي**: المظهر، المشاريع المتابَعة، المستجدات المقروءة، مسودة نموذج التواصل؛ مع صفحة لعرضها ومسحها.
- **وضع داكن** (فاتح/داكن/حسب الجهاز) بلا وميض.
- **تصفية المشاريع** حسب الحالة أو «أتابعها».
- **نموذج تواصل حقيقي**: تحقق في المتصفح وعلى الخادم، honeypot، حد للمحاولات، ولا رسالة نجاح إلا بعد إرسال فعلي.
- **SEO**: عنوان ووصف لكل صفحة، Open Graph، hreflang، sitemap، robots، JSON-LD (Organization، WebSite، Service، WebApplication).

## التشغيل
```bash
cd techmood-company
npm install
cp .env.example .env.local   # اختياري — كل المتغيرات اختيارية
npm run dev                  # http://localhost:3000
```

| الأمر | الوظيفة |
|---|---|
| `npm run lint` / `npm run typecheck` | الفحص والأنواع |
| `npm test` | اختبارات الوحدة (Vitest) |
| `npm run build` | بناء الإنتاج |
| `npm run test:e2e` | اختبارات المتصفح (Playwright، بعد البناء) |
| `npm run check:secrets` | يتأكد أن لا سر يصل إلى المتصفح |

## البنية
```
src/
  app/[lang]/        الصفحات (ar | en) — layout، not-found، error
  app/lang/[lang]/   تبديل اللغة وحفظها
  proxy.ts           توجيه اللغة: / عربي، /en إنجليزي
  config/            معلومات الشركة، الموقع، القائمة
  data/              الخدمات، المشاريع، الحلول، المستجدات  ← المحتوى
  components/        المكونات (client/ للتفاعلية)
  lib/               التخزين المحلي، التثبيت، الإشعارات، التواصل، SEO
public/sw.js         Service Worker (دون اتصال + الإشعارات)
```

## الوثائق
- [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) — الخطة والقرارات
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — النشر على Vercel وتفعيل النموذج
- [docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md) — تحديث المحتوى من الهاتف

## الهوية
الشعار الأصلي من مستودع منصة TechMood (`public/brand/`). الألوان: Royal Blue أساسي، Sky/Neon Blue للإبراز، أبيض، Dark Navy للنص، والبرتقالي لحالة «التخطيط» فقط. الخط: IBM Plex Sans Arabic (مستضاف محليًا).
