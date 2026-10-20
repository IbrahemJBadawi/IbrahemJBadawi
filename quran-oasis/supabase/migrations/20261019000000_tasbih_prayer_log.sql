-- إضافة شرائح المسبحة ومتابعة الصلوات إلى وثائق المستخدم
alter table public.user_documents drop constraint if exists user_documents_key_check;
alter table public.user_documents add constraint user_documents_key_check check (key in (
  'settings', 'lastRead', 'bookmarks', 'readingLog', 'adhkarLog', 'adhkarFavorites',
  'tasks', 'taskLog', 'khatmas', 'hifz', 'lessons', 'journal', 'oasisFavorites', 'oasisSeen',
  'tasbih', 'prayerLog'
));
