-- =====================================================================
-- Halaqati — Migration 0800: the same member summary for every member.
--  * private.current_streak(user): consecutive days with points.
--  * get_my_motivation: also readable by the staff of a halaqa the
--    student is active in (the teacher sees what the student sees).
--  * get_halaqa_member_summaries: one call for a halaqa's staff with
--    every active student's points, streak, weekly rank and quality.
-- =====================================================================

create or replace function private.current_streak(p_user uuid)
returns integer language plpgsql stable security definer set search_path = '' as $$
declare v_day date := current_date; v_n integer := 0;
begin
  if not exists (select 1 from public.points_ledger where user_id = p_user and day = v_day and points > 0) then
    v_day := v_day - 1;
  end if;
  while exists (select 1 from public.points_ledger where user_id = p_user and day = v_day and points > 0) loop
    v_n := v_n + 1;
    v_day := v_day - 1;
    exit when v_n >= 3650;
  end loop;
  return v_n;
end $$;

create or replace function private.is_staff_of_student(p_student uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.halaqa_memberships m
                 where m.user_id = p_student and m.role = 'student' and m.status = 'active'
                   and private.is_halaqa_staff(m.halaqa_id, p_user))
$$;

create or replace function public.get_my_motivation(p_student uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := coalesce(p_student, auth.uid());
  v_longest integer := 0;
  v_run integer := 0;
  v_prev date;
  r record;
begin
  if v_user is null or not (v_user = auth.uid() or private.is_parent_of(v_user) or private.is_staff_of_student(v_user)) then
    raise exception 'لا تملك صلاحية عرض بيانات هذا الطالب' using errcode = '42501';
  end if;
  for r in select distinct day from public.points_ledger
           where user_id = v_user and points > 0 and day >= current_date - 365 order by day loop
    if v_prev is not null and r.day = v_prev + 1 then v_run := v_run + 1; else v_run := 1; end if;
    v_longest := greatest(v_longest, v_run);
    v_prev := r.day;
  end loop;
  return jsonb_build_object(
    'current_streak', private.current_streak(v_user),
    'longest_streak', greatest(v_longest, private.current_streak(v_user)),
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

create or replace function public.get_halaqa_member_summaries(p_halaqa uuid)
returns table (student_id uuid, points_total bigint, points_week bigint, current_streak integer,
               week_rank bigint, members bigint, mastery_avg numeric, recitation_avg numeric)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_halaqa_staff(p_halaqa) then
    raise exception 'لا تملك صلاحية عرض طلاب هذه الحلقة' using errcode = '42501';
  end if;
  return query
  with s as (
    select m.user_id from public.halaqa_memberships m
     where m.halaqa_id = p_halaqa and m.role = 'student' and m.status = 'active'
  ), wk as (
    select s.user_id, coalesce(sum(l.points), 0)::bigint pts
    from s left join public.points_ledger l
      on l.user_id = s.user_id and l.halaqa_id = p_halaqa and l.day >= date_trunc('week', current_date)::date
    group by s.user_id
  )
  select s.user_id,
         (select coalesce(sum(points), 0) from public.points_ledger where user_id = s.user_id)::bigint,
         wk.pts,
         private.current_streak(s.user_id),
         rank() over (order by wk.pts desc),
         count(*) over (),
         (select round(avg(r.mastery_score)::numeric, 1) from public.quran_progress_records r
           where r.student_id = s.user_id and r.halaqa_id = p_halaqa and r.status = 'approved' and r.recorded_on >= current_date - 30),
         (select round(avg(r.recitation_score)::numeric, 1) from public.quran_progress_records r
           where r.student_id = s.user_id and r.halaqa_id = p_halaqa and r.status = 'approved' and r.recorded_on >= current_date - 30)
  from s join wk on wk.user_id = s.user_id;
end $$;

revoke execute on all functions in schema public from public, anon;
revoke execute on all functions in schema private from public, anon;
grant execute on function private.current_streak(uuid), private.is_staff_of_student(uuid, uuid) to authenticated, service_role;
grant execute on function public.get_my_motivation(uuid), public.get_halaqa_member_summaries(uuid) to authenticated;
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
