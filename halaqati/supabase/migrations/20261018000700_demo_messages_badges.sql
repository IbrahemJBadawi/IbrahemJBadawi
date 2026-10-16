-- =====================================================================
-- Halaqati — Migration 0700: demo data, halaqa messages, badges.
--
--  * Demo data («بيانات تجريبية»): a platform admin can seed a small,
--    clearly-labelled world (a demo teacher, demo students, a demo parent,
--    two demo halaqat with sessions, attendance, recitations, points,
--    reactions and messages) around their own account — and remove all of
--    it again with one call. Demo rows carry is_demo; nobody else can set
--    that flag, and demo halaqat never appear in the public directory.
--  * Halaqa messages («رسائل الحلقة»): announcements from the teacher and,
--    when the teacher allows it, messages from students. Parents read only.
--    No private messages between adults and children.
--  * Badge statistics for the «إنجازاتي» page.
-- =====================================================================

alter table public.profiles add column is_demo boolean not null default false;
alter table public.halaqat add column is_demo boolean not null default false;
alter table public.halaqat add column chat_students_can_post boolean not null default false;

-- Only the demo seeder (which sets halaqati.demo for its own transaction) may flag a halaqa.
create or replace function private.halaqat_demo_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.is_demo is distinct from (case when tg_op = 'INSERT' then false else old.is_demo end)
     and coalesce(current_setting('halaqati.demo', true), '') <> '1' then
    raise exception 'لا يمكن تغيير هذا الحقل' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger halaqat_demo_guard before insert or update of is_demo on public.halaqat
  for each row execute function private.halaqat_demo_guard();

-- Approved records stay undeletable — except demo records during a demo purge.
create or replace function private.progress_before_delete()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'approved'
     and not (coalesce(current_setting('halaqati.demo', true), '') = '1'
              and exists (select 1 from public.halaqat where id = old.halaqa_id and is_demo)) then
    raise exception 'لا يمكن حذف سجل معتمد' using errcode = '42501';
  end if;
  return old;
end $$;

-- Demo halaqat are never listed publicly.
create or replace function public.get_public_halaqat(
  p_search text default null,
  p_mode public.meeting_mode default null,
  p_level public.halaqa_level default null,
  p_gender public.audience_gender default null,
  p_limit integer default 12,
  p_offset integer default 0
) returns table (
  id uuid, name text, description text, teacher_id uuid, teacher_name text, teacher_verified boolean,
  center_id uuid, center_name text, is_independent boolean,
  audience_gender public.audience_gender, age_min smallint, age_max smallint,
  level public.halaqa_level, max_students smallint, active_students integer,
  meeting_mode public.meeting_mode, location_text text, schedule jsonb, timezone text,
  join_policy public.halaqa_join_policy, total_count bigint
) language sql stable security definer set search_path = '' as $$
  select h.id, h.name, h.description, h.teacher_id,
         coalesce(p.display_name, p.full_name), p.verified_teacher_at is not null,
         h.center_id, c.name, h.is_independent,
         h.audience_gender, h.age_min, h.age_max, h.level, h.max_students,
         private.halaqa_active_students(h.id),
         h.meeting_mode, h.location_text, h.schedule, h.timezone, h.join_policy,
         count(*) over ()
  from public.halaqat h
  join public.profiles p on p.id = h.teacher_id and p.deleted_at is null
  left join public.centers c on c.id = h.center_id
  where h.status = 'published' and h.deleted_at is null and not h.is_demo
    and (h.center_id is null or (c.deleted_at is null and c.status <> 'suspended'))
    and (p_search is null or p_search = '' or h.name ilike '%' || p_search || '%'
         or h.description ilike '%' || p_search || '%' or h.location_text ilike '%' || p_search || '%')
    and (p_mode is null or h.meeting_mode = p_mode)
    and (p_level is null or h.level = p_level or h.level = 'all')
    and (p_gender is null or h.audience_gender = p_gender or h.audience_gender = 'mixed')
  order by (p.verified_teacher_at is not null) desc, h.created_at desc
  limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0)
$$;

create or replace function public.get_public_halaqa(p_id uuid)
returns table (
  id uuid, name text, description text, teacher_id uuid, teacher_name text, teacher_bio text, teacher_verified boolean,
  center_id uuid, center_name text, is_independent boolean,
  audience_gender public.audience_gender, age_min smallint, age_max smallint,
  level public.halaqa_level, max_students smallint, active_students integer,
  meeting_mode public.meeting_mode, location_text text, schedule jsonb, timezone text,
  join_policy public.halaqa_join_policy
) language sql stable security definer set search_path = '' as $$
  select h.id, h.name, h.description, h.teacher_id,
         coalesce(p.display_name, p.full_name),
         case when p.directory_visible then p.bio end,
         p.verified_teacher_at is not null,
         h.center_id, c.name, h.is_independent,
         h.audience_gender, h.age_min, h.age_max, h.level, h.max_students,
         private.halaqa_active_students(h.id),
         h.meeting_mode, h.location_text, h.schedule, h.timezone, h.join_policy
  from public.halaqat h
  join public.profiles p on p.id = h.teacher_id and p.deleted_at is null
  left join public.centers c on c.id = h.center_id
  where h.id = p_id and h.status = 'published' and h.deleted_at is null and not h.is_demo
    and (h.center_id is null or (c.deleted_at is null and c.status <> 'suspended'))
$$;

-- ---------------------------------------------------------------------
-- Halaqa messages
-- ---------------------------------------------------------------------
create table public.halaqa_messages (
  id uuid primary key default gen_random_uuid(),
  halaqa_id uuid not null references public.halaqat (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  is_announcement boolean not null default false,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id) on delete set null
);
create index halaqa_messages_idx on public.halaqa_messages (halaqa_id, created_at desc);
alter table public.halaqa_messages enable row level security;
create policy halaqa_messages_select on public.halaqa_messages
  for select to authenticated
  using (deleted_at is null and (private.is_halaqa_staff(halaqa_id) or private.is_halaqa_student(halaqa_id)
                                 or private.is_parent_in_halaqa(halaqa_id)));
revoke insert, update, delete on public.halaqa_messages from authenticated;

create or replace function public.get_halaqa_messages(p_halaqa uuid, p_limit integer default 100)
returns table (
  id uuid, author_id uuid, author_name text, author_role text, body text,
  is_announcement boolean, pinned boolean, created_at timestamptz, is_mine boolean, can_delete boolean
) language plpgsql stable security definer set search_path = '' as $$
declare v_staff boolean := private.is_halaqa_staff(p_halaqa);
begin
  if not (v_staff or private.is_halaqa_student(p_halaqa) or private.is_parent_in_halaqa(p_halaqa)) then
    raise exception 'الرسائل متاحة لأعضاء الحلقة فقط' using errcode = '42501';
  end if;
  return query
  select m.id, m.author_id, coalesce(p.display_name, p.full_name),
         coalesce((select hm.role::text from public.halaqa_memberships hm
                   where hm.halaqa_id = m.halaqa_id and hm.user_id = m.author_id and hm.status = 'active'
                   order by hm.role limit 1), 'former'),
         m.body, m.is_announcement, m.pinned, m.created_at,
         m.author_id = auth.uid(), v_staff or m.author_id = auth.uid()
  from public.halaqa_messages m join public.profiles p on p.id = m.author_id
  where m.halaqa_id = p_halaqa and m.deleted_at is null
  order by m.created_at desc
  limit least(greatest(p_limit, 1), 200);
end $$;

create or replace function public.post_halaqa_message(p_halaqa uuid, p_body text, p_announcement boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_staff boolean := private.is_halaqa_staff(p_halaqa);
  v_id uuid;
  v_name text;
  v_halaqa text;
  r record;
begin
  if v_uid is null then raise exception 'يجب تسجيل الدخول' using errcode = '42501'; end if;
  if not (v_staff or (private.is_halaqa_student(p_halaqa)
                      and exists (select 1 from public.halaqat where id = p_halaqa and chat_students_can_post))) then
    raise exception 'الكتابة في هذه الحلقة متاحة للمعلّم فقط' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 1000 then
    raise exception 'اكتب رسالة من 1 إلى 1000 حرف' using errcode = '23514';
  end if;
  if not private.consume_rate_limit('halaqa_msg:' || v_uid, 30, 3600) then
    raise exception 'أرسلت رسائل كثيرة، حاول بعد قليل' using errcode = 'P0001';
  end if;
  insert into public.halaqa_messages (halaqa_id, author_id, body, is_announcement)
  values (p_halaqa, v_uid, btrim(p_body), v_staff and coalesce(p_announcement, false))
  returning id into v_id;

  if v_staff and coalesce(p_announcement, false) then
    select coalesce(display_name, full_name) into v_name from public.profiles where id = v_uid;
    select name into v_halaqa from public.halaqat where id = p_halaqa;
    for r in
      select m.user_id from public.halaqa_memberships m
       where m.halaqa_id = p_halaqa and m.role = 'student' and m.status = 'active'
      union
      select l.parent_id from public.parent_student_links l
        join public.halaqa_memberships m on m.user_id = l.student_id
       where m.halaqa_id = p_halaqa and m.role = 'student' and m.status = 'active' and l.status = 'active'
    loop
      perform private.notify(r.user_id, 'halaqa.announcement', '📣 ' || v_halaqa || ': ' || left(btrim(p_body), 80),
                             null, '/dashboard/messages?h=' || p_halaqa);
    end loop;
  end if;
  return v_id;
end $$;

create or replace function public.delete_halaqa_message(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_m public.halaqa_messages;
begin
  select * into v_m from public.halaqa_messages where id = p_id and deleted_at is null;
  if v_m.id is null or not (v_m.author_id = auth.uid() or private.is_halaqa_staff(v_m.halaqa_id)) then
    raise exception 'لا تملك صلاحية حذف هذه الرسالة' using errcode = '42501';
  end if;
  update public.halaqa_messages set deleted_at = now(), deleted_by = auth.uid() where id = p_id;
  if v_m.author_id <> auth.uid() then
    perform private.audit('halaqa_message.removed', 'halaqa_message', p_id,
      jsonb_build_object('halaqa_id', v_m.halaqa_id, 'author_id', v_m.author_id));
  end if;
end $$;

create or replace function public.pin_halaqa_message(p_id uuid, p_pinned boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_halaqa uuid;
begin
  select halaqa_id into v_halaqa from public.halaqa_messages where id = p_id and deleted_at is null;
  if v_halaqa is null or not private.is_halaqa_staff(v_halaqa) then
    raise exception 'التثبيت متاح للمعلّم فقط' using errcode = '42501';
  end if;
  update public.halaqa_messages set pinned = coalesce(p_pinned, false) where id = p_id;
end $$;

-- ---------------------------------------------------------------------
-- Badge statistics («إنجازاتي»)
-- ---------------------------------------------------------------------
create or replace function public.get_my_badge_stats(p_student uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := coalesce(p_student, auth.uid());
begin
  if v_user is null or not (v_user = auth.uid() or private.is_parent_of(v_user)) then
    raise exception 'لا تملك صلاحية عرض بيانات هذا الطالب' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'recitations', (select count(*) from public.quran_progress_records where student_id = v_user and status = 'approved'),
    'new_ayat', (select coalesce(sum(ayah_count), 0) from public.quran_progress_records
                 where student_id = v_user and status = 'approved' and activity = 'new_memorization' and completion = 'completed'),
    'review_ayat', (select coalesce(sum(ayah_count), 0) from public.quran_progress_records
                    where student_id = v_user and status = 'approved' and activity <> 'new_memorization' and completion <> 'not_completed'),
    'attended', (select count(*) from public.attendance_records where student_id = v_user and status in ('present', 'late')),
    'wird_days', (select count(*) from public.daily_wird where user_id = v_user),
    'tasks_done', (select count(*) from public.personal_tasks where user_id = v_user and done_at is not null),
    'certificates', (select count(*) from public.certificates where student_id = v_user and revoked_at is null),
    'reactions_received', (select count(*) from public.reactions x
                           where (x.entity_type = 'progress_record' and x.entity_id in (select id from public.quran_progress_records where student_id = v_user))
                              or (x.entity_type = 'certificate' and x.entity_id in (select id from public.certificates where student_id = v_user))),
    'points_total', (select coalesce(sum(points), 0) from public.points_ledger where user_id = v_user)
  );
end $$;

-- ---------------------------------------------------------------------
-- Demo data
-- ---------------------------------------------------------------------
create or replace function private.demo_user(p_name text, p_roles text[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid := gen_random_uuid(); c text;
begin
  -- No password and an unroutable address: demo people can never sign in.
  insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at)
  values (v_id, 'demo-' || replace(v_id::text, '-', '') || '@demo.halaqati.invalid',
          jsonb_build_object('full_name', p_name, 'roles', to_jsonb(p_roles)), now());
  -- Supabase Auth expects empty strings (not NULL) in its token columns.
  for c in select column_name from information_schema.columns
           where table_schema = 'auth' and table_name = 'users'
             and column_name in ('confirmation_token', 'recovery_token', 'email_change_token_new', 'email_change',
                                 'email_change_token_current', 'phone_change', 'phone_change_token', 'reauthentication_token') loop
    execute format('update auth.users set %I = coalesce(%I, '''') where id = $1', c, c) using v_id;
  end loop;
  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'aud') then
    execute 'update auth.users set aud = ''authenticated'', role = ''authenticated'' where id = $1' using v_id;
  end if;
  update public.profiles set is_demo = true where id = v_id;
  return v_id;
end $$;

create or replace function private.demo_serial()
returns text language plpgsql set search_path = '' as $$
declare v text; a text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; b bytea;
begin
  loop
    b := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    v := 'HQ-' || to_char(current_date, 'YYYY') || '-';
    for i in 0..7 loop v := v || substr(a, (get_byte(b, i) % 32) + 1, 1); end loop;
    exit when not exists (select 1 from public.certificates where serial = v);
  end loop;
  return v;
end $$;

-- Records a past session in a demo halaqa: attendance + recitations for every active student.
create or replace function private.demo_session(p_halaqa uuid, p_day date, p_seed integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_session uuid;
  v_status public.attendance_status;
  v_surah smallint;
  v_len smallint;
  v_rec uuid;
  r record;
  i integer := 0;
begin
  insert into public.quran_sessions (halaqa_id, starts_at, duration_minutes, mode, meeting_url, topic, status)
  values (p_halaqa, (p_day + time '17:00') at time zone 'Asia/Riyadh', 60, 'remote',
          'https://meet.jit.si/halaqati-demo', 'تسميع ومراجعة', 'completed')
  returning id into v_session;
  for r in select m.user_id from public.halaqa_memberships m
           where m.halaqa_id = p_halaqa and m.role = 'student' and m.status = 'active' order by m.user_id loop
    i := i + 1;
    v_status := (case when (p_seed + i * 7) % 11 = 0 then 'absent'
                      when (p_seed + i * 5) % 7 = 0 then 'late' else 'present' end)::public.attendance_status;
    insert into public.attendance_records (session_id, halaqa_id, student_id, status)
    values (v_session, p_halaqa, r.user_id, v_status);
    if v_status <> 'absent' then
      v_surah := 114 - ((p_seed + i * 3) % 30);
      select ayah_count into v_len from public.quran_surahs where number = v_surah;
      insert into public.quran_progress_records
        (student_id, halaqa_id, session_id, activity, surah_from, ayah_from, surah_to, ayah_to,
         completion, mastery_score, recitation_score, plan_adherence, teacher_notes, recorded_on, status)
      values (r.user_id, p_halaqa, v_session, 'new_memorization', v_surah, 1, v_surah, v_len,
              (case when (p_seed + i) % 6 = 0 then 'partial' else 'completed' end)::public.completion_status,
              3 + (p_seed + i) % 3, 3 + (p_seed + i * 2) % 3,
              (case when (p_seed + i) % 6 = 0 then 'partial' else 'met' end)::public.plan_adherence,
              case when (p_seed + i) % 4 = 0 then 'أحسنت، انتبه لأحكام المدود' end,
              p_day, 'approved')
      returning id into v_rec;
      if (p_seed + i) % 5 = 0 then
        insert into public.quran_error_records (progress_record_id, error_type, surah, ayah, note)
        values (v_rec, 'tajweed', v_surah, 1, 'مدّ طبيعي');
      end if;
      if (p_seed + i) % 2 = 0 then
        insert into public.quran_progress_records
          (student_id, halaqa_id, session_id, activity, surah_from, ayah_from, surah_to, ayah_to,
           completion, mastery_score, recitation_score, plan_adherence, recorded_on, status)
        values (r.user_id, p_halaqa, v_session, 'far_review', 112, 1, 114, 6, 'completed', 5, 4, 'met', p_day, 'approved');
      end if;
    end if;
  end loop;
end $$;

create or replace function public.admin_seed_demo()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := auth.uid();
  v_teacher uuid;
  v_parent uuid;
  v_students uuid[] := '{}';
  v_names text[] := array['يوسف', 'عمر', 'مريم', 'خالد', 'سارة', 'عبدالرحمن', 'لينا', 'حمزة'];
  v_a uuid;
  v_b uuid;
  v_day date;
  v_seed integer := 0;
  v_rec uuid;
  v_cert uuid;
  v_id uuid;
  n text;
begin
  if not private.is_platform_admin() then raise exception 'صلاحية غير كافية' using errcode = '42501'; end if;
  if exists (select 1 from public.profiles where is_demo) then
    raise exception 'البيانات التجريبية موجودة بالفعل. احذفها أولًا لإعادة إنشائها.' using errcode = 'P0001';
  end if;
  perform set_config('halaqati.demo', '1', true);
  -- Demo records get their error notes right after approval.
  perform set_config('halaqati.amend_reason', 'بيانات تجريبية', true);

  v_teacher := private.demo_user('الشيخ أحمد الحربي (تجريبي)', array['quran_teacher']);
  update public.profiles set bio = 'محفّظ تجريبي لعرض المنصة.' where id = v_teacher;
  v_parent := private.demo_user('أبو خالد (تجريبي)', array['parent']);
  foreach n in array v_names loop
    v_students := v_students || private.demo_user(n || ' (تجريبي)', array['student']);
  end loop;

  -- Halaqa A: taught by the demo teacher; the admin is a student in it.
  insert into public.halaqat (name, description, teacher_id, level, max_students, meeting_mode, schedule, timezone,
                              status, join_policy, is_demo, chat_students_can_post)
  values ('حلقة الفجر (تجريبية)', 'حلقة تجريبية لعرض المنصة: حفظ جزء عمّ ومراجعته.', v_teacher, 'beginner', 20, 'remote',
          '[{"day":0,"start":"17:00","duration":60},{"day":2,"start":"17:00","duration":60},{"day":4,"start":"17:00","duration":60}]',
          'Asia/Riyadh', 'published', 'approval', true, true)
  returning id into v_a;
  -- Halaqa B: taught by the admin, to try the teacher's side.
  insert into public.halaqat (name, description, teacher_id, level, max_students, meeting_mode, schedule, timezone,
                              status, join_policy, is_demo)
  values ('حلقة المراجعة (تجريبية)', 'حلقة تجريبية تديرها أنت كمحفّظ.', v_owner, 'all', 20, 'remote',
          '[{"day":1,"start":"18:00","duration":45},{"day":3,"start":"18:00","duration":45}]',
          'Asia/Riyadh', 'published', 'approval', true)
  returning id into v_b;

  insert into public.halaqa_memberships (halaqa_id, user_id, role, status, joined_at, decided_at)
  select x.h, x.u, 'student'::public.halaqa_member_role, 'active'::public.membership_status,
         now() - interval '30 days', now() - interval '30 days'
  from (select v_a h, u from unnest(v_students[1:6]) u
        union all select v_a, v_owner
        union all select v_b, u from unnest(v_students[3:8]) u) x;
  insert into public.halaqa_memberships (halaqa_id, user_id, role, status, request_message)
  values (v_b, v_students[1], 'student', 'pending', 'السلام عليكم، أرغب في الانضمام للمراجعة.');

  -- The demo parent follows خالد; the admin follows مريم (to try the parent's side).
  insert into public.parent_student_links (parent_id, student_id, relationship)
  values (v_parent, v_students[4], 'father'), (v_owner, v_students[3], 'guardian');

  -- Three weeks of past sessions (Sun/Tue/Thu in A, Mon/Wed in B).
  for v_day in select d::date from generate_series(current_date - 21, current_date - 1, interval '1 day') d loop
    v_seed := v_seed + 1;
    if extract(dow from v_day) in (0, 2, 4) then perform private.demo_session(v_a, v_day, v_seed); end if;
    if extract(dow from v_day) in (1, 3) then perform private.demo_session(v_b, v_day, v_seed + 3); end if;
  end loop;

  -- Upcoming sessions and an open assignment for the admin.
  insert into public.quran_sessions (halaqa_id, starts_at, duration_minutes, mode, meeting_url, topic)
  select v_a, (d::date + time '17:00') at time zone 'Asia/Riyadh', 60, 'remote'::public.meeting_mode, 'https://meet.jit.si/halaqati-demo', 'تسميع سورة جديدة'
    from generate_series(current_date, current_date + 7, interval '1 day') d where extract(dow from d) in (0, 2, 4)
  union all
  select v_b, (d::date + time '18:00') at time zone 'Asia/Riyadh', 45, 'remote', 'https://meet.jit.si/halaqati-demo-b', 'مراجعة'
    from generate_series(current_date, current_date + 7, interval '1 day') d where extract(dow from d) in (1, 3);
  insert into public.quran_assignments (halaqa_id, student_id, activity, surah_from, ayah_from, surah_to, ayah_to, due_on, instructions)
  values (v_a, v_owner, 'new_memorization', 87, 1, 87, 19, current_date + 2, 'احفظ سورة الأعلى مع مراعاة أحكام الغنّة.');

  -- Daily wird for demo students (keeps their streaks alive in the league).
  for v_day in select d::date from generate_series(current_date - 6, current_date, interval '1 day') d loop
    for i in 1..array_length(v_students, 1) loop
      if (i + extract(day from v_day)::integer) % 3 <> 0 then
        insert into public.daily_wird (user_id, day, pages) values (v_students[i], v_day, 2 + i % 4) returning id into v_id;
        perform private.award_points(v_students[i], null, 'daily_wird', v_id, 3, v_day);
      end if;
    end loop;
  end loop;

  -- A certificate for the admin, issued by the demo teacher.
  insert into public.certificates (serial, student_id, halaqa_id, issued_by, kind, title, description)
  values (private.demo_serial(), v_owner, v_a, v_teacher, 'surah_completion', 'إتمام حفظ سورة النبأ (تجريبية)', 'شهادة تجريبية لعرض المنصة.')
  returning id into v_cert;

  -- Messages in halaqa A.
  insert into public.halaqa_messages (halaqa_id, author_id, body, is_announcement, pinned, created_at) values
    (v_a, v_teacher, 'السلام عليكم ورحمة الله. موعدنا الأحد والثلاثاء والخميس الساعة الخامسة مساءً. احرصوا على مراجعة الورد يوميًا 🌿', true, true, now() - interval '20 days'),
    (v_a, v_students[1], 'وعليكم السلام شيخنا، جزاكم الله خيرًا', false, false, now() - interval '20 days' + interval '5 minutes'),
    (v_a, v_students[3], 'هل نراجع سورة النبأ هذا الأسبوع؟', false, false, now() - interval '3 days'),
    (v_a, v_teacher, 'نعم إن شاء الله، مع مراجعة آخر ثلاث سور.', false, false, now() - interval '3 days' + interval '10 minutes'),
    (v_a, v_teacher, 'ما شاء الله على التزامكم هذا الأسبوع! الدوري مشتعل 🔥', true, false, now() - interval '1 day');

  -- Reactions: the demo teacher encourages the admin; the demo parent encourages خالد.
  for v_rec in select id from public.quran_progress_records where student_id = v_owner and halaqa_id = v_a order by recorded_on desc limit 3 loop
    insert into public.reactions (user_id, entity_type, entity_id, kind) values (v_teacher, 'progress_record', v_rec, 'mashallah');
  end loop;
  insert into public.reactions (user_id, entity_type, entity_id, kind) values (v_teacher, 'certificate', v_cert, 'star');
  for v_rec in select id from public.quran_progress_records where student_id = v_students[4] order by recorded_on desc limit 4 loop
    insert into public.reactions (user_id, entity_type, entity_id, kind) values (v_parent, 'progress_record', v_rec, 'heart');
  end loop;

  insert into private.app_settings (key, value) values ('demo_owner', v_owner::text), ('demo_seeded_at', now()::text)
  on conflict (key) do update set value = excluded.value;
  perform private.audit('demo.seeded', 'demo', null, jsonb_build_object('halaqat', array[v_a, v_b]));
  return jsonb_build_object('users', array_length(v_students, 1) + 2, 'halaqat', 2,
                            'records', (select count(*) from public.quran_progress_records where halaqa_id in (v_a, v_b)));
end $$;

create or replace function public.admin_purge_demo()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_users integer;
  v_halaqat integer;
  v_owner uuid := (select value::uuid from private.app_settings where key = 'demo_owner');
  v_at timestamptz := (select value::timestamptz from private.app_settings where key = 'demo_seeded_at');
begin
  if not private.is_platform_admin() then raise exception 'صلاحية غير كافية' using errcode = '42501'; end if;
  perform set_config('halaqati.demo', '1', true);
  perform set_config('halaqati.amend_reason', 'حذف البيانات التجريبية', true);

  delete from public.reactions x
   where (x.entity_type = 'progress_record' and x.entity_id in (
            select r.id from public.quran_progress_records r join public.halaqat h on h.id = r.halaqa_id where h.is_demo))
      or (x.entity_type = 'certificate' and x.entity_id in (
            select c.id from public.certificates c left join public.halaqat h on h.id = c.halaqa_id
             where h.is_demo or c.student_id in (select id from public.profiles where is_demo)));
  delete from public.certificates c
   where c.halaqa_id in (select id from public.halaqat where is_demo)
      or c.student_id in (select id from public.profiles where is_demo);
  delete from public.quran_progress_records where halaqa_id in (select id from public.halaqat where is_demo);
  delete from public.parent_student_links
   where parent_id in (select id from public.profiles where is_demo) or student_id in (select id from public.profiles where is_demo);
  if v_owner is not null and v_at is not null then
    delete from public.notifications where user_id = v_owner and created_at = v_at;
  end if;
  delete from public.notifications where link_path like '/dashboard/messages?h=%'
     and substr(link_path, 23) in (select id::text from public.halaqat where is_demo);
  with d as (delete from public.halaqat where is_demo returning 1) select count(*) into v_halaqat from d;
  with d as (delete from auth.users where id in (select id from public.profiles where is_demo) returning 1) select count(*) into v_users from d;
  delete from private.app_settings where key in ('demo_owner', 'demo_seeded_at');
  perform private.audit('demo.purged', 'demo', null, jsonb_build_object('users', v_users, 'halaqat', v_halaqat));
  return jsonb_build_object('users', v_users, 'halaqat', v_halaqat);
end $$;

create or replace function public.admin_demo_status()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then raise exception 'صلاحية غير كافية' using errcode = '42501'; end if;
  return jsonb_build_object(
    'users', (select count(*) from public.profiles where is_demo),
    'halaqat', (select count(*) from public.halaqat where is_demo),
    'seeded_at', (select value from private.app_settings where key = 'demo_seeded_at'),
    'ready', exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                     where n.nspname = 'public' and p.proname = 'admin_purge_demo')
             and has_function_privilege('authenticated', 'public.admin_seed_demo()', 'execute')
  );
end $$;

-- ---------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon;
grant select on public.quran_surahs to anon;
revoke execute on all functions in schema public from public, anon;
revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;
revoke execute on function private.bootstrap_platform_admin(text) from authenticated, service_role;
revoke execute on function private.consume_rate_limit(text, integer, integer) from authenticated;
revoke execute on function private.audit(text, text, uuid, jsonb, uuid, uuid) from authenticated;
revoke execute on function private.notify(uuid, text, text, text, text) from authenticated;
revoke execute on function private.notify_halaqa_managers(uuid, text, text, text, text) from authenticated;
revoke execute on function private.handle_new_user() from authenticated, service_role;
revoke execute on function private.award_points(uuid, uuid, public.point_source, uuid, integer, date) from authenticated;
revoke execute on function private.apply_pending_role_grants() from authenticated, service_role;
revoke execute on function private.demo_user(text, text[]) from authenticated, service_role;
revoke execute on function private.demo_session(uuid, date, integer) from authenticated, service_role;
revoke execute on function private.demo_serial() from authenticated, service_role;

grant execute on function
  public.get_halaqa_messages(uuid, integer),
  public.post_halaqa_message(uuid, text, boolean),
  public.delete_halaqa_message(uuid),
  public.pin_halaqa_message(uuid, boolean),
  public.get_my_badge_stats(uuid),
  public.admin_seed_demo(),
  public.admin_purge_demo(),
  public.admin_demo_status()
to authenticated;
grant execute on function
  public.get_public_halaqat(text, public.meeting_mode, public.halaqa_level, public.audience_gender, integer, integer),
  public.get_public_halaqa(uuid),
  public.get_public_teachers(text, integer, integer),
  public.get_public_centers(text, integer, integer),
  public.verify_certificate(text),
  public.get_vapid_public_key(),
  public.claim_push(text),
  public.prune_push_subscription(text, text)
to anon;
