-- ═══════════════════════════════════════════════════════════════════════
-- واحة القرآن — المخطط الأولي لقاعدة البيانات
-- مبادئ الأمان:
--   • RLS مفعّل على كل الجداول؛ لا يرى المستخدم إلا بياناته.
--   • لا يستطيع المستخدم تغيير دوره (role)؛ يمنعه trigger حتى لو حاول عبر API.
--   • المدير لا يقرأ بيانات المستخدمين الشخصية (التقدم والخواطر)؛ يرى إحصاءات مجمّعة فقط.
--   • المحتوى العام يُقرأ للجميع إذا كان منشورًا، ولا يعدّله إلا الطاقم (editor/admin).
-- ═══════════════════════════════════════════════════════════════════════

-- ───────── الملفات الشخصية والأدوار ─────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  role text not null default 'user' check (role in ('user', 'editor', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- دوال الصلاحيات (security definer لتجنّب التكرار اللانهائي في سياسات profiles)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'editor'));
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_staff() from public;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;

create policy "profiles: read own or admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "profiles: update own or admin" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- لا سياسة insert/delete: الإنشاء عبر trigger، والحذف عبر delete_my_account() أو حذف المستخدم من auth.

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id <> old.id then
    raise exception 'لا يمكن تغيير معرف الملف الشخصي';
  end if;
  if new.role <> old.role then
    -- يُسمح بتغيير الدور فقط لمدير، أو من سياق قاعدة البيانات المباشر (SQL Editor / service role)
    if auth.uid() is not null and not public.is_admin() then
      raise exception 'غير مسموح بتغيير الدور';
    end if;
    if old.role = 'admin' and new.role <> 'admin'
       and (select count(*) from public.profiles where role = 'admin') <= 1 then
      raise exception 'لا يمكن إزالة آخر مدير للمنصة';
    end if;
  end if;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- إنشاء الملف الشخصي تلقائيًا عند التسجيل (الدور دائمًا user)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 80), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────── بيانات المستخدم الشخصية (تقدم، مفضلة، خطط، حفظ، خواطر) ─────────
create table public.user_documents (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null check (key in (
    'settings', 'lastRead', 'bookmarks', 'readingLog', 'adhkarLog', 'adhkarFavorites',
    'tasks', 'taskLog', 'khatmas', 'hifz', 'lessons', 'journal', 'oasisFavorites', 'oasisSeen'
  )),
  data jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key),
  constraint user_documents_size check (pg_column_size(data) < 1048576)
);

alter table public.user_documents enable row level security;

create policy "user_documents: owner select" on public.user_documents
  for select to authenticated using (user_id = (select auth.uid()));
create policy "user_documents: owner insert" on public.user_documents
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "user_documents: owner update" on public.user_documents
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "user_documents: owner delete" on public.user_documents
  for delete to authenticated using (user_id = (select auth.uid()));

-- ───────── المصادر ─────────
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  author text check (char_length(author) <= 200),
  publisher text check (char_length(publisher) <= 200),
  url text check (url is null or url ~* '^https?://'),
  license text check (char_length(license) <= 300),
  kind text not null default 'other' check (kind in ('quran', 'tafsir', 'hadith', 'adhkar', 'learning', 'other')),
  notes text check (char_length(notes) <= 2000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────── الأذكار ─────────
create table public.adhkar_categories (
  id text primary key check (id ~ '^[a-z0-9-]{1,40}$'),
  title text not null check (char_length(title) between 1 and 80),
  description text check (char_length(description) <= 300),
  icon text not null default 'hands',
  sort int not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.adhkar (
  id text primary key check (id ~ '^[a-z0-9-]{1,60}$'),
  category_id text not null references public.adhkar_categories (id) on update cascade on delete restrict,
  title text check (char_length(title) <= 120),
  body text check (char_length(body) <= 4000),
  -- مراجع قرآنية: [{"surah":2,"from":255,"to":255}] — يُعرض نصها من المصدر المعتمد
  quran jsonb check (quran is null or jsonb_typeof(quran) = 'array'),
  repeat int not null default 1 check (repeat between 1 and 1000),
  source_text text not null check (char_length(source_text) between 1 and 500),
  source_id uuid references public.sources (id) on delete set null,
  virtue text check (char_length(virtue) <= 1000),
  note text check (char_length(note) <= 1000),
  sort int not null default 0,
  active boolean not null default true,
  reviewed boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint adhkar_has_content check (body is not null or quran is not null)
);
create index adhkar_category_idx on public.adhkar (category_id, sort);

-- ───────── لحظة واحة ─────────
create table public.oasis_moments (
  id text primary key default ('m-' || replace(gen_random_uuid()::text, '-', '')) check (id ~ '^[a-z0-9-]{1,60}$'),
  surah int not null check (surah between 1 and 114),
  ayah_from int not null check (ayah_from between 1 and 286),
  ayah_to int not null check (ayah_to between 1 and 286),
  meaning text check (char_length(meaning) <= 4000),
  meaning_source text check (char_length(meaning_source) <= 300),
  source_id uuid references public.sources (id) on delete set null,
  reflection text check (char_length(reflection) <= 1000),
  action text check (char_length(action) <= 1000),
  -- تاريخ النشر المجدول (اختياري). بدون تاريخ = ضمن المكتبة الدورية
  publish_date date unique,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint oasis_range check (ayah_to >= ayah_from),
  constraint oasis_meaning_sourced check (meaning is null or meaning_source is not null)
);

-- ───────── التعلّم ─────────
create table public.learning_paths (
  id text primary key check (id ~ '^[a-z0-9-]{1,60}$'),
  title text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 1000),
  goals text[] not null default '{}',
  level text not null default 'مبتدئ',
  color text not null default 'olive' check (color in ('olive', 'gold', 'deep')),
  sort int not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.lessons (
  path_id text not null references public.learning_paths (id) on update cascade on delete cascade,
  id text not null check (id ~ '^[a-z0-9-]{1,60}$'),
  title text not null check (char_length(title) between 1 and 160),
  summary text check (char_length(summary) <= 500),
  minutes int not null default 5 check (minutes between 1 and 240),
  body text not null check (char_length(body) <= 30000),
  sources text[] not null default '{}',
  sort int not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (path_id, id)
);

-- ───────── سجل الأخطاء الأساسية ─────────
create table public.error_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  message text not null check (char_length(message) <= 2000),
  stack text check (char_length(stack) <= 8000),
  url text check (char_length(url) <= 500),
  user_agent text check (char_length(user_agent) <= 500)
);
create index error_logs_created_idx on public.error_logs (created_at desc);

-- ───────── RLS للمحتوى ─────────
alter table public.sources enable row level security;
alter table public.adhkar_categories enable row level security;
alter table public.adhkar enable row level security;
alter table public.oasis_moments enable row level security;
alter table public.learning_paths enable row level security;
alter table public.lessons enable row level security;
alter table public.error_logs enable row level security;

create policy "sources: public read active" on public.sources
  for select to anon, authenticated using (active or (select public.is_staff()));
create policy "adhkar_categories: public read active" on public.adhkar_categories
  for select to anon, authenticated using (active or (select public.is_staff()));
create policy "adhkar: public read active" on public.adhkar
  for select to anon, authenticated using (active or (select public.is_staff()));
-- اللحظات المجدولة لا تظهر قبل موعدها (هامش يوم لفروق التوقيت)
create policy "oasis: public read published" on public.oasis_moments
  for select to anon, authenticated using (
    (status = 'published' and (publish_date is null or publish_date <= current_date + 1))
    or (select public.is_staff())
  );
create policy "learning_paths: public read active" on public.learning_paths
  for select to anon, authenticated using (active or (select public.is_staff()));
create policy "lessons: public read active" on public.lessons
  for select to anon, authenticated using (active or (select public.is_staff()));

-- الكتابة على المحتوى: للطاقم فقط
do $$
declare t text;
begin
  foreach t in array array['sources', 'adhkar_categories', 'adhkar', 'oasis_moments', 'learning_paths', 'lessons'] loop
    execute format('create policy "%1$s: staff insert" on public.%1$I for insert to authenticated with check ((select public.is_staff()))', t);
    execute format('create policy "%1$s: staff update" on public.%1$I for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()))', t);
    execute format('create policy "%1$s: staff delete" on public.%1$I for delete to authenticated using ((select public.is_staff()))', t);
    execute format('create trigger %1$s_touch before update on public.%1$I for each row execute function public.touch_updated_at()', t);
  end loop;
end;
$$;

-- سجل الأخطاء: يمكن لأي زائر إضافة خطأ (بدون قراءة)، والقراءة والحذف للمدير فقط
create policy "error_logs: anyone insert" on public.error_logs
  for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));
create policy "error_logs: admin read" on public.error_logs
  for select to authenticated using ((select public.is_admin()));
create policy "error_logs: admin delete" on public.error_logs
  for delete to authenticated using ((select public.is_admin()));

-- ───────── دوال إدارية (تتحقق من الصلاحية داخليًا) ─────────
create or replace function public.admin_list_users(search text default null, lim int default 50, off int default 0)
returns table (id uuid, email text, display_name text, role text, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'غير مصرح' using errcode = '42501';
  end if;
  return query
    select u.id, u.email::text, p.display_name, p.role, u.created_at, u.last_sign_in_at
    from auth.users u
    join public.profiles p on p.id = u.id
    where search is null or search = ''
       or u.email ilike '%' || search || '%'
       or p.display_name ilike '%' || search || '%'
    order by u.created_at desc
    limit least(greatest(lim, 1), 200) offset greatest(off, 0);
end;
$$;

create or replace function public.admin_set_role(target uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'غير مصرح' using errcode = '42501';
  end if;
  if new_role not in ('user', 'editor', 'admin') then
    raise exception 'دور غير صالح';
  end if;
  update public.profiles set role = new_role where id = target;
end;
$$;

create or replace function public.admin_stats()
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare result json;
begin
  if not public.is_staff() then
    raise exception 'غير مصرح' using errcode = '42501';
  end if;
  select json_build_object(
    'users_total', (select count(*) from public.profiles),
    'users_new_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'users_active_1d', (select count(distinct user_id) from public.user_documents where updated_at > now() - interval '1 day'),
    'users_active_7d', (select count(distinct user_id) from public.user_documents where updated_at > now() - interval '7 days'),
    'adhkar', (select count(*) from public.adhkar where active),
    'moments_published', (select count(*) from public.oasis_moments where status = 'published'),
    'moments_scheduled', (select count(*) from public.oasis_moments where status = 'published' and publish_date > current_date),
    'lessons', (select count(*) from public.lessons where active),
    'errors_7d', (select count(*) from public.error_logs where created_at > now() - interval '7 days')
  ) into result;
  return result;
end;
$$;

-- حذف الحساب: يحذف المستخدم نفسه وكل بياناته (cascade)
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'يجب تسجيل الدخول' using errcode = '42501';
  end if;
  if (select role from public.profiles where id = uid) = 'admin'
     and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'لا يمكن حذف حساب آخر مدير. عيّن مديرًا آخر أولًا.';
  end if;
  delete from public.error_logs where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

-- ترقية مستخدم إلى مدير: تُنفّذ فقط من SQL Editor في لوحة Supabase (لا يمكن استدعاؤها عبر API)
create or replace function public.promote_to_admin(user_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(user_email);
  if uid is null then
    raise exception 'لا يوجد مستخدم بهذا البريد';
  end if;
  update public.profiles set role = 'admin' where id = uid;
end;
$$;

revoke all on function public.admin_list_users(text, int, int) from public, anon;
revoke all on function public.admin_set_role(uuid, text) from public, anon;
revoke all on function public.admin_stats() from public, anon;
revoke all on function public.delete_my_account() from public, anon;
revoke all on function public.promote_to_admin(text) from public, anon, authenticated;
grant execute on function public.admin_list_users(text, int, int) to authenticated;
grant execute on function public.admin_set_role(uuid, text) to authenticated;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.guard_profile_update() from public, anon, authenticated;
