# النشر

## على Vercel (من الهاتف أيضًا)
1. افتح [vercel.com/new](https://vercel.com/new) وسجّل الدخول بـ GitHub.
2. اختر المستودع `IbrahemJBadawi/IbrahemJBadawi` ثم **Import**.
3. في **Root Directory** اختر `techmood-company` (مهم: المستودع فيه مشاريع أخرى).
4. الإطار يُكتشف تلقائيًا (Next.js). لا حاجة لتغيير أوامر البناء.
5. **Environment Variables** — كلها اختيارية (انظر `.env.example`):
   - `NEXT_PUBLIC_SITE_URL` — بعد تحديد النطاق النهائي فقط (مثل `https://example.com`). بدونه: لا canonical، والموقع `noindex` حتى لا تُفهرس عناوين مؤقتة.
   - للإرسال بالبريد: `RESEND_API_KEY` و`CONTACT_TO_EMAIL` و`CONTACT_FROM_EMAIL`.
   - للإرسال إلى Telegram: `TELEGRAM_BOT_TOKEN` و`TELEGRAM_CHAT_ID`.
6. **Deploy**. كل دفع (push) إلى الفرع الرئيسي يعيد النشر تلقائيًا، وكل فرع آخر يحصل على رابط معاينة.

> لا تغيّر نطاق منصة TechMood (`techmoodtech.vercel.app`) ولا إعدادات DNS لهذا الموقع؛ هذا مشروع Vercel جديد ومنفصل.

## تفعيل نموذج التواصل
**Telegram (الأسهل والمجاني):**
1. في Telegram افتح `@BotFather` ← `/newbot` ← احفظ الـ token.
2. ابدأ محادثة مع البوت (أو أضفه إلى مجموعة خاصة)، ثم افتح `https://api.telegram.org/bot<TOKEN>/getUpdates` لتعرف `chat.id`.
3. ضع `TELEGRAM_BOT_TOKEN` و`TELEGRAM_CHAT_ID` في Vercel وأعد النشر.

**البريد عبر Resend:** أنشئ حسابًا، ووثّق نطاقًا للإرسال، ثم ضع المتغيرات الثلاثة.

بعد الإعداد جرّب النموذج: يجب أن تظهر «وصل طلبك» وتصل الرسالة. إن فشلت كل القنوات تظهر رسالة فشل ولا يُدّعى النجاح.

## الحماية من الرسائل الآلية
- حقل خفي (honeypot) ومهلة دنيا قبل الإرسال، وتحقق كامل على الخادم.
- حد 5 رسائل لكل عنوان IP كل 10 دقائق **داخل كل خادم** (ذاكرة مؤقتة). لحد شامل فعّل *Vercel Firewall → Rate Limiting* على المسار `/contact` بطريقة POST.

## نقل الموقع إلى مستودع مستقل (اختياري)
المجلد مستقل بالكامل: انسخ محتوى `techmood-company/` إلى جذر مستودع جديد، ثم في Vercel اجعل Root Directory فارغًا.

## الإشعارات أثناء إغلاق الموقع (لاحقًا)
الإشعارات الحالية تعمل عند فتح الموقع أو التطبيق المثبّت. للإرسال أثناء الإغلاق يلزم: مفاتيح VAPID، ومخزن لاشتراكات الأجهزة (مثل Supabase)، ومسار خادم يرسل عبر `web-push`. ملف `public/sw.js` يعالج حدث `push` مسبقًا.

## الفحوصات قبل النشر
```bash
npm ci
npm run lint && npm run typecheck && npm test
npm run build && npm run check:secrets
PW_CHROMIUM_PATH=/path/to/chrome npm run test:e2e   # اختياري
```
تُشغَّل تلقائيًا في GitHub Actions (`.github/workflows/techmood-company-ci.yml`).
