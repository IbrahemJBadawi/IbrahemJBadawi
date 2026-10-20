# الإعداد والنشر

## 1. مشروع Supabase
1. أنشئ مشروعًا جديدًا (الخطة المجانية تكفي للبداية).
2. طبّق الـ migrations بالترتيب من `supabase/migrations/`:
   - عبر Supabase CLI: `supabase link --project-ref <ref>` ثم `supabase db push`
   - أو انسخ كل ملف إلى SQL Editor ونفّذه بالترتيب.
3. **Authentication → URL Configuration**
   - Site URL: رابط الموقع (مثل `https://halaqati.example`)
   - Redirect URLs: `https://halaqati.example/auth/callback` و `https://halaqati.example/auth/confirm`
4. **Authentication → Providers → Email**: فعّل "Confirm email". اضبط SMTP خاصًا (مثل Resend أو Brevo بخطتهما المجانية)، فخادم Supabase الافتراضي محدود جدًا.
5. (اختياري، يدعم المتصفحات التي تفتح الروابط في جهاز آخر) عدّل قوالب البريد لتستخدم `token_hash`:
   - Confirm signup: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard`
   - Reset password: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`

## 2. أول مدير للمنصة
لا يمكن لأي مستخدم منح نفسه صلاحية الإدارة. بعد تسجيل حسابك من الموقع نفّذ في SQL Editor:
```sql
select private.bootstrap_platform_admin('you@example.com');
```
بعدها يمنح المدير الأدوار للآخرين من لوحة «المستخدمون»، وكل منح يُسجّل في سجل التدقيق.

## 3. متغيرات البيئة
انظر `.env.example`:
| المتغير | علني؟ | الوصف |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | نعم | رابط الموقع لروابط البريد |
| `NEXT_PUBLIC_SUPABASE_URL` | نعم | رابط المشروع |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | نعم | المفتاح العلني (publishable أو anon) — البيانات محمية بـ RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | **لا، سري** | يُستخدم فقط لتحديد معدل محاولات الدخول والتسجيل. اختياري |

لا تضف بادئة `NEXT_PUBLIC_` لأي سر. الأمر `npm run check:secrets` يفشل إذا وصل سر إلى حزمة المتصفح.

## 4. النشر (Vercel أو أي منصة Node)
- Root directory: `halaqati`
- Build: `npm run build`، Start: `npm start`
- أضف المتغيرات أعلاه في إعدادات المنصة.

## 5. التطوير المحلي دون Docker
يوفّر `scripts/local-stack/` بديلًا خفيفًا لـ `supabase start`: PostgreSQL محلي + خادم Supabase Auth + PostgREST + بوابة صغيرة على المنفذ 54321. تُنزَّل الملفات التنفيذية من إصدارات GitHub الرسمية:
```bash
# PostgreSQL 15+ يعمل محليًا (المستخدم postgres/postgres)
bash scripts/local-stack/setup-db.sh
# شغّل Supabase Auth (v2.177) مع GOTRUE_DB_NAMESPACE=auth و GOTRUE_MAILER_AUTOCONFIRM=true
bash scripts/local-stack/apply-app.sh
# شغّل PostgREST (v12) بالـ db-anon-role=anon، ثم:
node scripts/local-stack/gateway.mjs
node scripts/local-stack/keys.mjs   # يطبع مفاتيح anon/service للتطوير فقط
```
هذه البيئة للتطوير والاختبار فقط ولا تُستخدم في الإنتاج.
