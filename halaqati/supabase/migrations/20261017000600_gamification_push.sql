-- =====================================================================
-- Halaqati — Migration 0600: motivation, tasks, reactions, statistics,
-- and Web Push notifications.
--
--  * points_ledger: every point has a source row (recitation, attendance,
--    task, daily wird). Points are written only by triggers/RPCs.
--  * Daily streak («الحماسة») = consecutive days with points.
--  * League («الدوري») is per halaqa, visible only to its members/staff;
--    members can hide their name, teachers can switch the league off.
--  * Web Push: pg_net calls the app with a one-time token; the app claims
--    the payload (incl. VAPID keys kept in private.app_settings) via RPC.
-- =====================================================================

create type public.point_source as enum ('recitation', 'attendance', 'task', 'daily_wird', 'certificate');
create type public.reaction_kind as enum ('mashallah', 'barakallah', 'clap', 'star', 'heart');

alter table public.profiles add column league_visible boolean not null default true;
grant update (league_visible) on public.profiles to authenticated;
alter table public.halaqat add column league_enabled boolean not null default true;

-- ---------------------------------------------------------------------
-- Points ledger
-- ---------------------------------------------------------------------
create table public.points_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  halaqa_id uuid references public.halaqat (id) on delete cascade,
  source public.point_source not null,
  ref_id uuid not null,
  points smallint not null check (points between 0 and 100),
  day date not null default current_date,
  created_at timestamptz not null default now(),
  unique (source, ref_id, user_id)
);
create index points_user_day_idx on public.points_ledger (user_id, day desc);
create index points_halaqa_day_idx on public.points_ledger (halaqa_id, day desc);
alter table public.points_ledger enable row level security;
create policy points_select on public.points_ledger
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_parent_of(user_id)
         or (halaqa_id is not null and private.is_halaqa_staff(halaqa_id)));
revoke insert, update, delete on public.points_ledger from authenticated;

create or replace function private.award_points(
  p_user uuid, p_halaqa uuid, p_source public.point_source, p_ref uuid, p_points integer, p_day date
) returns void language sql security definer set search_path = '' as $$
  insert into public.points_ledger (user_id, halaqa_id, source, ref_id, points, day)
  values (p_user, p_halaqa, p_source, p_ref, greatest(least(p_points, 100), 0), coalesce(p_day, current_date))
  on conflict (source, ref_id, user_id) do update set points = excluded.points, day = excluded.day
$$;

-- Approved recitation: new memorization 10, review 6, +5 when completed.
create or replace function private.points_for_recitation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'approved' then
    perform private.award_points(new.student_id, new.halaqa_id, 'recitation', new.id,
      (case when new.activity = 'new_memorization' then 10 else 6 end)
      + (case when new.completion = 'completed' then 5 when new.completion = 'partial' then 2 else 0 end),
      new.recorded_on);
  end if;
  return new;
end $$;
create trigger progress_points after insert or update of status, completion, activity on public.quran_progress_records
  for each row execute function private.points_for_recitation();

-- Attendance: present 5, late 3, otherwise 0.
create or replace function private.points_for_attendance()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_day date;
begin
  select (s.starts_at at time zone h.timezone)::date into v_day
  from public.quran_sessions s join public.halaqat h on h.id = s.halaqa_id
  where s.id = new.session_id;
  perform private.award_points(new.student_id, new.halaqa_id, 'attendance', new.id,
    case new.status when 'present' then 5 when 'late' then 3 else 0 end, v_day);
  return new;
end $$;
create trigger attendance_points after insert or update of status on public.attendance_records
  for each row execute function private.points_for_attendance();

-- ---------------------------------------------------------------------
-- Personal tasks («مهامي»)
-- ---------------------------------------------------------------------
create table public.personal_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 2 and 150),
  notes text check (notes is null or char_length(notes) <= 500),
  due_on date,
  priority smallint not null default 2 check (priority between 1 and 3),
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index personal_tasks_user_idx on public.personal_tasks (user_id, done_at, due_on);
create trigger personal_tasks_updated_at before update on public.personal_tasks
  for each row execute function private.set_updated_at();
alter table public.personal_tasks enable row level security;
create policy tasks_select on public.personal_tasks for select to authenticated using (user_id = (select auth.uid()));
create policy tasks_insert on public.personal_tasks for insert to authenticated with check (user_id = (select auth.uid()));
create policy tasks_update on public.personal_tasks for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy tasks_delete on public.personal_tasks for delete to authenticated using (user_id = (select auth.uid()));

-- Completing a task earns 2 points, at most 5 tasks (10 points) a day.
create or replace function private.points_for_task()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.done_at is not null and (tg_op = 'INSERT' or old.done_at is null)
     and (select coalesce(sum(points), 0) from public.points_ledger
          where user_id = new.user_id and source = 'task' and day = current_date) < 10 then
    perform private.award_points(new.user_id, null, 'task', new.id, 2, current_date);
  end if;
  return new;
end $$;
create trigger personal_tasks_points after insert or update of done_at on public.personal_tasks
  for each row execute function private.points_for_task();

-- ---------------------------------------------------------------------
-- Daily wird (self-reported daily reading) — one per day, 3 points.
-- ---------------------------------------------------------------------
create table public.daily_wird (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null default current_date,
  pages smallint not null check (pages between 1 and 604),
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now(),
  unique (user_id, day)
);
alter table public.daily_wird enable row level security;
create policy daily_wird_select on public.daily_wird
  for select to authenticated using (user_id = (select auth.uid()) or private.is_parent_of(user_id));
revoke insert, update, delete on public.daily_wird from authenticated;

create or replace function public.log_daily_wird(p_pages integer, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'يجب تسجيل الدخول' using errcode = '42501'; end if;
  insert into public.daily_wird (user_id, pages, note)
  values (v_uid, greatest(least(p_pages, 604), 1), nullif(btrim(p_note), ''))
  on conflict (user_id, day) do update set pages = excluded.pages, note = excluded.note
  returning id into v_id;
  perform private.award_points(v_uid, null, 'daily_wird', v_id, 3, current_date);
end $$;

-- ---------------------------------------------------------------------
-- Streak («الحماسة») and weekly activity
-- ---------------------------------------------------------------------
create or replace function public.get_my_motivation(p_student uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := coalesce(p_student, auth.uid());
  v_day date := current_date;
  v_current integer := 0;
  v_longest integer := 0;
  v_run integer := 0;
  v_prev date;
  r record;
begin
  if v_user is null or not (v_user = auth.uid() or private.is_parent_of(v_user)) then
    raise exception 'لا تملك صلاحية عرض بيانات هذا الطالب' using errcode = '42501';
  end if;
  -- Current streak: today (if active) or yesterday backwards.
  if not exists (select 1 from public.points_ledger where user_id = v_user and day = v_day and points > 0) then
    v_day := v_day - 1;
  end if;
  while exists (select 1 from public.points_ledger where user_id = v_user and day = v_day and points > 0) loop
    v_current := v_current + 1;
    v_day := v_day - 1;
    exit when v_current >= 3650;
  end loop;
  -- Longest streak over the last year.
  for r in select distinct day from public.points_ledger
           where user_id = v_user and points > 0 and day >= current_date - 365 order by day loop
    if v_prev is not null and r.day = v_prev + 1 then v_run := v_run + 1; else v_run := 1; end if;
    v_longest := greatest(v_longest, v_run);
    v_prev := r.day;
  end loop;
  return jsonb_build_object(
    'current_streak', v_current,
    'longest_streak', greatest(v_longest, v_current),
    'active_today', exists (select 1 from public.points_ledger where user_id = v_user and day = current_date and points > 0),
    'points_total', (select coalesce(sum(points), 0) from public.points_ledger where user_id = v_user),
    'points_week', (select coalesce(sum(points), 0) from public.points_ledger
                    where user_id = v_user and day >= date_trunc('week', current_date)::date),
    'wird_today', (select pages from public.daily_wird where user_id = v_user and day = current_date),
    'last7', (select jsonb_agg(jsonb_build_object('day', d::date,
                       'points', (select coalesce(sum(points), 0) from public.points_ledger where user_id = v_user and day = d::date))
                       order by d)
              from generate_series(current_date - 6, current_date, interval '1 day') d)
  );
end $$;

-- ---------------------------------------------------------------------
-- League («الدوري») — per halaqa, members/staff/parents only
-- ---------------------------------------------------------------------
create or replace function public.get_halaqa_league(p_halaqa uuid, p_period text default 'week')
returns table (rank bigint, student_id uuid, name text, points bigint, is_me boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_staff boolean := private.is_halaqa_staff(p_halaqa);
  v_since date := case p_period when 'month' then date_trunc('month', current_date)::date
                                when 'all' then date '2000-01-01'
                                else date_trunc('week', current_date)::date end;
begin
  if not (v_staff or private.is_halaqa_student(p_halaqa) or private.is_parent_in_halaqa(p_halaqa)) then
    raise exception 'الدوري متاح لأعضاء الحلقة فقط' using errcode = '42501';
  end if;
  if not v_staff and not exists (select 1 from public.halaqat where id = p_halaqa and league_enabled) then
    return;
  end if;
  return query
  with totals as (
    select m.user_id, coalesce(sum(l.points), 0)::bigint pts
    from public.halaqa_memberships m
    left join public.points_ledger l
      on l.user_id = m.user_id and l.halaqa_id = p_halaqa and l.day >= v_since
    where m.halaqa_id = p_halaqa and m.role = 'student' and m.status = 'active'
    group by m.user_id
  )
  select rank() over (order by t.pts desc), t.user_id,
         case when v_staff or t.user_id = auth.uid() or p.league_visible or private.is_parent_of(t.user_id)
              then coalesce(p.display_name, p.full_name) else 'مشارك' end,
         t.pts, t.user_id = auth.uid()
  from totals t join public.profiles p on p.id = t.user_id
  order by t.pts desc, coalesce(p.display_name, p.full_name)
  limit 100;
end $$;

-- ---------------------------------------------------------------------
-- Reactions («التفاعلات») on recitations and certificates
-- ---------------------------------------------------------------------
create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  entity_type text not null check (entity_type in ('progress_record', 'certificate')),
  entity_id uuid not null,
  kind public.reaction_kind not null,
  created_at timestamptz not null default now(),
  unique (user_id, entity_type, entity_id, kind)
);
create index reactions_entity_idx on public.reactions (entity_type, entity_id);

create or replace function private.can_see_entity(p_type text, p_id uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select case p_type
    when 'progress_record' then exists (
      select 1 from public.quran_progress_records r where r.id = p_id
        and (private.is_halaqa_staff(r.halaqa_id, p_user)
             or (r.status = 'approved' and (r.student_id = p_user or private.is_parent_of(r.student_id, p_user)))))
    when 'certificate' then exists (
      select 1 from public.certificates c where c.id = p_id
        and (c.student_id = p_user or private.is_parent_of(c.student_id, p_user)
             or (c.halaqa_id is not null and private.is_halaqa_staff(c.halaqa_id, p_user))))
    else false end
$$;

alter table public.reactions enable row level security;
create policy reactions_select on public.reactions
  for select to authenticated using (private.can_see_entity(entity_type, entity_id));
create policy reactions_insert on public.reactions
  for insert to authenticated with check (user_id = (select auth.uid()) and private.can_see_entity(entity_type, entity_id));
create policy reactions_delete on public.reactions
  for delete to authenticated using (user_id = (select auth.uid()));
revoke update on public.reactions from authenticated;

create or replace function private.reactions_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_owner uuid; v_name text; v_label text;
begin
  select case new.entity_type
    when 'progress_record' then (select student_id from public.quran_progress_records where id = new.entity_id)
    else (select student_id from public.certificates where id = new.entity_id) end into v_owner;
  if v_owner is null or v_owner = new.user_id then return new; end if;
  select coalesce(display_name, full_name) into v_name from public.profiles where id = new.user_id;
  v_label := case new.kind when 'mashallah' then 'ما شاء الله' when 'barakallah' then 'بارك الله فيك'
                           when 'clap' then 'أحسنت 👏' when 'star' then 'نجمة ⭐' else 'أحببته ❤️' end;
  perform private.notify(v_owner, 'reaction.added', coalesce(v_name, 'أحدهم') || ': ' || v_label, null,
    case new.entity_type when 'progress_record' then '/dashboard/journey' else '/dashboard/certificates' end);
  return new;
end $$;
create trigger reactions_notify after insert on public.reactions
  for each row execute function private.reactions_notify();

-- ---------------------------------------------------------------------
-- Statistics
-- ---------------------------------------------------------------------
-- Weekly series for one student (self / parent; staff with p_halaqa).
create or replace function public.get_student_stats(p_student uuid, p_weeks integer default 12, p_halaqa uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_weeks integer := greatest(least(p_weeks, 52), 4);
begin
  if not (auth.uid() = p_student or private.is_parent_of(p_student)
          or (p_halaqa is not null and private.is_halaqa_staff(p_halaqa))) then
    raise exception 'لا تملك صلاحية عرض بيانات هذا الطالب' using errcode = '42501';
  end if;
  return (
    with weeks as (
      select generate_series(date_trunc('week', current_date)::date - (v_weeks - 1) * 7,
                             date_trunc('week', current_date)::date, interval '7 day')::date as wk
    )
    select jsonb_agg(jsonb_build_object(
      'week', w.wk,
      'points', (select coalesce(sum(points), 0) from public.points_ledger l
                 where l.user_id = p_student and l.day >= w.wk and l.day < w.wk + 7
                   and (p_halaqa is null or l.halaqa_id = p_halaqa)),
      'new_ayat', (select coalesce(sum(ayah_count), 0) from public.quran_progress_records r
                   where r.student_id = p_student and r.status = 'approved' and r.activity = 'new_memorization'
                     and r.completion = 'completed' and r.recorded_on >= w.wk and r.recorded_on < w.wk + 7
                     and (p_halaqa is null or r.halaqa_id = p_halaqa)),
      'review_ayat', (select coalesce(sum(ayah_count), 0) from public.quran_progress_records r
                      where r.student_id = p_student and r.status = 'approved' and r.activity <> 'new_memorization'
                        and r.completion <> 'not_completed' and r.recorded_on >= w.wk and r.recorded_on < w.wk + 7
                        and (p_halaqa is null or r.halaqa_id = p_halaqa)),
      'mastery', (select round(avg(mastery_score)::numeric, 2) from public.quran_progress_records r
                  where r.student_id = p_student and r.status = 'approved' and r.recorded_on >= w.wk and r.recorded_on < w.wk + 7
                    and (p_halaqa is null or r.halaqa_id = p_halaqa))
    ) order by w.wk) from weeks w
  );
end $$;

-- Weekly series for a halaqa (staff only).
create or replace function public.get_halaqa_stats(p_halaqa uuid, p_weeks integer default 12)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_weeks integer := greatest(least(p_weeks, 52), 4);
begin
  if not private.is_halaqa_staff(p_halaqa) then
    raise exception 'لا تملك صلاحية عرض إحصائيات هذه الحلقة' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'active_students', private.halaqa_active_students(p_halaqa),
    'weeks', (
      with weeks as (
        select generate_series(date_trunc('week', current_date)::date - (v_weeks - 1) * 7,
                               date_trunc('week', current_date)::date, interval '7 day')::date as wk
      )
      select jsonb_agg(jsonb_build_object(
        'week', w.wk,
        'sessions', (select count(*) from public.quran_sessions s where s.halaqa_id = p_halaqa and s.status <> 'cancelled'
                     and s.starts_at >= w.wk and s.starts_at < w.wk + 7),
        'attended', (select count(*) from public.attendance_records a join public.quran_sessions s on s.id = a.session_id
                     where a.halaqa_id = p_halaqa and a.status in ('present', 'late') and s.starts_at >= w.wk and s.starts_at < w.wk + 7),
        'marked', (select count(*) from public.attendance_records a join public.quran_sessions s on s.id = a.session_id
                   where a.halaqa_id = p_halaqa and s.starts_at >= w.wk and s.starts_at < w.wk + 7),
        'new_ayat', (select coalesce(sum(ayah_count), 0) from public.quran_progress_records r
                     where r.halaqa_id = p_halaqa and r.status = 'approved' and r.activity = 'new_memorization'
                       and r.completion = 'completed' and r.recorded_on >= w.wk and r.recorded_on < w.wk + 7),
        'records', (select count(*) from public.quran_progress_records r
                    where r.halaqa_id = p_halaqa and r.status = 'approved' and r.recorded_on >= w.wk and r.recorded_on < w.wk + 7)
      ) order by w.wk) from weeks w
    )
  );
end $$;

-- Platform overview (platform admins only).
create or replace function public.admin_platform_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then raise exception 'صلاحية غير كافية' using errcode = '42501'; end if;
  return jsonb_build_object(
    'users', (select count(*) from public.profiles where deleted_at is null),
    'roles', (select jsonb_object_agg(role, n) from (select role, count(*) n from public.user_roles where revoked_at is null group by role) t),
    'halaqat_published', (select count(*) from public.halaqat where status = 'published' and deleted_at is null),
    'halaqat_total', (select count(*) from public.halaqat where deleted_at is null),
    'sessions_30d', (select count(*) from public.quran_sessions where starts_at >= now() - interval '30 days' and status <> 'cancelled'),
    'records_30d', (select count(*) from public.quran_progress_records where status = 'approved' and recorded_on >= current_date - 30),
    'ayat_30d', (select coalesce(sum(ayah_count), 0) from public.quran_progress_records where status = 'approved' and recorded_on >= current_date - 30),
    'open_tickets', (select count(*) from public.support_tickets where status in ('open', 'in_progress')),
    'push_devices', (select count(*) from public.push_subscriptions),
    'signups', (
      with weeks as (
        select generate_series(date_trunc('week', current_date)::date - 11 * 7, date_trunc('week', current_date)::date, interval '7 day')::date as wk
      )
      select jsonb_agg(jsonb_build_object('week', w.wk,
        'count', (select count(*) from public.profiles p where p.created_at >= w.wk and p.created_at < w.wk + 7)) order by w.wk)
      from weeks w)
  );
end $$;

-- ---------------------------------------------------------------------
-- Web Push
-- ---------------------------------------------------------------------
create table private.app_settings (
  key text primary key,
  value text not null
);
alter table private.app_settings enable row level security;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  user_agent text check (user_agent is null or char_length(user_agent) <= 300),
  created_at timestamptz not null default now(),
  last_sent_at timestamptz
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create policy push_select_own on public.push_subscriptions for select to authenticated using (user_id = (select auth.uid()));
create policy push_delete_own on public.push_subscriptions for delete to authenticated using (user_id = (select auth.uid()));
revoke insert, update on public.push_subscriptions from authenticated;

create table private.push_outbox (
  token text primary key,
  notification_id uuid not null references public.notifications (id) on delete cascade,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);
alter table private.push_outbox enable row level security;

create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'يجب تسجيل الدخول' using errcode = '42501'; end if;
  if not private.consume_rate_limit('push_sub:' || v_uid, 20, 86400) then
    raise exception 'تجاوزت الحد المسموح، حاول لاحقًا' using errcode = 'P0001';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (v_uid, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh,
    auth = excluded.auth, user_agent = excluded.user_agent;
end $$;

create or replace function public.get_vapid_public_key()
returns text language sql stable security definer set search_path = '' as $$
  select value from private.app_settings where key = 'vapid_public'
$$;

-- Queue a push for each new notification whose user has a device.
create or replace function private.notifications_push()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_token text; v_site text;
begin
  if not exists (select 1 from public.push_subscriptions where user_id = new.user_id) then return new; end if;
  select value into v_site from private.app_settings where key = 'site_url';
  if v_site is null or not exists (select 1 from pg_extension where extname = 'pg_net') then return new; end if;
  v_token := encode(sha256(convert_to(gen_random_uuid()::text || gen_random_uuid()::text || clock_timestamp()::text, 'UTF8')), 'hex');
  insert into private.push_outbox (token, notification_id) values (v_token, new.id);
  execute 'select net.http_post(url := $1, body := $2, headers := $3)'
    using v_site || '/api/push', jsonb_build_object('token', v_token), '{"Content-Type": "application/json"}'::jsonb;
  return new;
exception when others then
  -- A push must never block the notification itself.
  return new;
end $$;
create trigger notifications_push after insert on public.notifications
  for each row execute function private.notifications_push();

-- Called by the app's /api/push with the one-time token from pg_net.
create or replace function public.claim_push(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_out private.push_outbox; v_n public.notifications;
begin
  update private.push_outbox set claimed_at = now()
   where token = p_token and claimed_at is null and created_at > now() - interval '10 minutes'
  returning * into v_out;
  if v_out.token is null then return null; end if;
  select * into v_n from public.notifications where id = v_out.notification_id;
  update public.push_subscriptions set last_sent_at = now() where user_id = v_n.user_id;
  return jsonb_build_object(
    'title', v_n.title, 'body', v_n.body, 'url', coalesce(v_n.link_path, '/dashboard/notifications'),
    'vapid_public', (select value from private.app_settings where key = 'vapid_public'),
    'vapid_private', (select value from private.app_settings where key = 'vapid_private'),
    'vapid_subject', coalesce((select value from private.app_settings where key = 'vapid_subject'), 'mailto:admin@halaqati.app'),
    'subscriptions', coalesce((select jsonb_agg(jsonb_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth))
                               from public.push_subscriptions where user_id = v_n.user_id), '[]'::jsonb)
  );
end $$;

-- Drop a device the push service reported as gone (only within a claim).
create or replace function public.prune_push_subscription(p_token text, p_endpoint text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.push_subscriptions s
   using private.push_outbox o, public.notifications n
   where o.token = p_token and o.claimed_at > now() - interval '10 minutes'
     and n.id = o.notification_id and s.user_id = n.user_id and s.endpoint = p_endpoint;
  if random() < 0.05 then
    delete from private.push_outbox where created_at < now() - interval '1 day';
  end if;
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

grant execute on function
  public.log_daily_wird(integer, text),
  public.get_my_motivation(uuid),
  public.get_halaqa_league(uuid, text),
  public.get_student_stats(uuid, integer, uuid),
  public.get_halaqa_stats(uuid, integer),
  public.admin_platform_stats(),
  public.save_push_subscription(text, text, text, text),
  public.get_vapid_public_key()
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
