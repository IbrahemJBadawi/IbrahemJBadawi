# حلقتي | Halaqati — رحلتك مع القرآن

منصة ويب عربية (RTL، Mobile-First) لإدارة حلقات تحفيظ القرآن الكريم ومتابعة رحلة الطالب، تربط الطلاب بالمحفّظين وأولياء الأمور والدور والمراكز.

## التقنية
- **Next.js 16** (App Router، Server Actions) + **TypeScript** + **Tailwind CSS 4**
- **Supabase**: المصادقة + PostgreSQL مع **Row Level Security** على كل الجداول
- **Zod** للتحقق على الخادم، **Vitest** و **Playwright** للاختبارات

## البدء السريع
```bash
cd halaqati
npm install
cp .env.example .env.local     # ثم املأ القيم — راجع docs/SETUP.md
npm run dev                    # http://localhost:3000
```

## الأوامر
| الأمر | الوظيفة |
|---|---|
| `npm run dev` / `build` / `start` | التشغيل والبناء |
| `npm run lint` / `typecheck` | الفحص الثابت |
| `npm run test:unit` | اختبارات الوحدات |
| `npm run test:db` | اختبارات الأمان على قاعدة البيانات (PostgreSQL محلي، دون Docker) |
| `npm run test:e2e` | اختبارات المتصفح على شاشة هاتف |
| `npm run check:secrets` | التأكد من عدم تسرّب الأسرار إلى الواجهة |

## الوثائق
- [docs/SETUP.md](docs/SETUP.md) — إعداد Supabase والمتغيرات والنشر
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — البنية ونموذج البيانات والصلاحيات والقرارات
- [docs/TESTING.md](docs/TESTING.md) — الاختبارات وما تثبته
- [docs/OPERATIONS.md](docs/OPERATIONS.md) — دليل الإدارة والنسخ الاحتياطي والخصوصية
- [docs/STATUS.md](docs/STATUS.md) — ما أُنجز وما تبقى
