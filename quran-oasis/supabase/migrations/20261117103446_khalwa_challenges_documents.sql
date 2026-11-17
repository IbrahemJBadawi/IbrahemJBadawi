-- شرائح جديدة من بيانات المستخدم الخاصة؛ تستفيد من سياسات RLS الموجودة
-- على public.user_documents. لا تُنشأ جداول عامة لبيانات الخلوة أو المنافسة.
alter table public.user_documents drop constraint if exists user_documents_key_check;
alter table public.user_documents add constraint user_documents_key_check check (key in (
  'settings', 'lastRead', 'bookmarks', 'readingLog', 'adhkarLog', 'adhkarFavorites',
  'tasks', 'taskLog', 'khatmas', 'hifz', 'lessons', 'journal', 'oasisFavorites', 'oasisSeen',
  'tasbih', 'prayerLog', 'khalwa', 'challenges'
));
