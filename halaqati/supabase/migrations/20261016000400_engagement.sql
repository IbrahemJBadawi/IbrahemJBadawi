-- =====================================================================
-- Halaqati — Migration 0400: engagement & trust features
--  * Teacher verification requests (✓ badge), reviewed by platform admin
--  * Achievement certificates with unique serial + public verification
--  * Support tickets & abuse reports
--  * Onboarding dismissal, weekly commitment streak
--  * Teacher "students table" per halaqa
-- =====================================================================

create type public.review_status as enum ('pending', 'approved', 'rejected');
create type public.certificate_kind as enum ('juz_completion', 'surah_completion', 'khatm', 'attendance', 'other');
create type public.ticket_category as enum ('report_abuse', 'technical', 'privacy', 'suggestion', 'other');
create type public.ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');

-- ---------------------------------------------------------------------
-- Profile additions
-- ---------------------------------------------------------------------
alter table public.profiles
  add column verified_teacher_at timestamptz,
  add column onboarding_dismissed_at timestamptz;
grant update (onboarding_dismissed_at) on public.profiles to authenticated;

-- Only platform admins (through RPC) may set the verification stamp.
create or replace function private.guard_profile_verification()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.verified_teacher_at is distinct from old.verified_teacher_at
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'التوثيق يتم من إدارة المنصة فقط' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_guard_verification before update on public.profiles
  for each row execute function private.guard_profile_verification();

-- ---------------------------------------------------------------------
-- Teacher verification requests
-- ---------------------------------------------------------------------
create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Free-text qualifications (ijazah, sanad, experience). No ID documents.
  qualifications text not null check (char_length(btrim(qualifications)) between 20 and 2000),
  evidence_url text check (evidence_url is null or (evidence_url ~ '^https://' and char_length(evidence_url) <= 500)),
  status public.review_status not null default 'pending',
  review_note text check (review_note is null or char_length(review_note) <= 1000),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index verification_requests_pending_unique on public.verification_requests (user_id) where status = 'pending';
alter table public.verification_requests enable row level security;
create policy verification_requests_select on public.verification_requests
  for select to authenticated using (user_id = (select auth.uid()) or private.is_platform_admin());
revoke insert, update, delete on public.verification_requests from authenticated;

create or replace function public.submit_teacher_verification(p_qualifications text, p_evidence_url text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'يجب تسجيل الدخول' using errcode = '42501'; end if;
  if not private.has_role('quran_teacher', v_uid) and not private.has_role('instructor', v_uid) then
    raise exception 'التوثيق متاح للمحفّظين والمعلمين' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = v_uid and verified_teacher_at is not null) then
    raise exception 'حسابك موثّق بالفعل' using errcode = 'P0001';
  end if;
  if not private.consume_rate_limit('verify:' || v_uid, 3, 86400) then
    raise exception 'تجاوزت الحد المسموح، حاول لاحقًا' using errcode = 'P0001';
  end if;
  insert into public.verification_requests (user_id, qualifications, evidence_url)
  values (v_uid, btrim(p_qualifications), nullif(btrim(p_evidence_url), ''))
  on conflict (user_id) where status = 'pending' do nothing
  returning id into v_id;
  if v_id is null then raise exception 'لديك طلب توثيق قيد المراجعة' using errcode = 'P0001'; end if;
  perform private.audit('verification.requested', 'verification_request', v_id, '{}'::jsonb);
  return v_id;
end $$;

create or replace function public.admin_review_verification(p_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_req public.verification_requests;
begin
  if not private.is_platform_admin() then raise exception 'صلاحية غير كافية' using errcode = '42501'; end if;
  select * into v_req from public.verification_requests where id = p_id and status = 'pending' for update;
  if v_req.id is null then raise exception 'الطلب غير موجود أو تمت مراجعته' using errcode = 'P0002'; end if;
  update public.verification_requests
     set status = case when p_approve then 'approved'::public.review_status else 'rejected'::public.review_status end,
         review_note = nullif(btrim(p_note), ''), reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_id;
  if p_approve then
    update public.profiles set verified_teacher_at = now() where id = v_req.user_id;
  end if;
  perform private.notify(v_req.user_id, 'verification.reviewed',
    case when p_approve then 'تم توثيق حسابك كمحفّظ ✓' else 'لم يُقبل طلب التوثيق' end,
    nullif(btrim(p_note), ''), '/dashboard/profile');
  perform private.audit(case when p_approve then 'verification.approved' else 'verification.rejected' end,
                        'user', v_req.user_id, jsonb_build_object('request_id', p_id));
end $$;

create or replace function public.admin_revoke_teacher_verification(p_user uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then raise exception 'صلاحية غير كافية' using errcode = '42501'; end if;
  update public.profiles set verified_teacher_at = null where id = p_user;
  perform private.audit('verification.revoked', 'user', p_user, jsonb_build_object('reason', p_reason));
end $$;

create or replace function public.admin_list_verification_requests(p_limit integer default 50)
returns table (id uuid, user_id uuid, full_name text, email text, qualifications text, evidence_url text,
               status public.review_status, review_note text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then raise exception 'صلاحية غير كافية' using errcode = '42501'; end if;
  return query
  select r.id, r.user_id, p.full_name, u.email::text, r.qualifications, r.evidence_url, r.status, r.review_note, r.created_at
  from public.verification_requests r
  join public.profiles p on p.id = r.user_id
  join auth.users u on u.id = r.user_id
  order by (r.status = 'pending') desc, r.created_at desc
  limit least(greatest(p_limit, 1), 100);
end $$;

-- ---------------------------------------------------------------------
-- Certificates
-- ---------------------------------------------------------------------
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  serial text not null unique check (serial ~ '^HQ-[0-9]{4}-[A-Z0-9]{8}$'),
  student_id uuid not null references public.profiles (id) on delete cascade,
  halaqa_id uuid references public.halaqat (id) on delete set null,
  issued_by uuid references public.profiles (id) on delete set null,
  kind public.certificate_kind not null,
  title text not null check (char_length(btrim(title)) between 3 and 150),
  title_en text check (title_en is null or char_length(title_en) <= 150),
  description text check (description is null or char_length(description) <= 500),
  issued_on date not null default current_date,
  -- The holder decides whether their full name appears on the public page.
  show_name_publicly boolean not null default false,
  revoked_at timestamptz,
  revoke_reason text check (revoke_reason is null or char_length(revoke_reason) <= 300),
  created_at timestamptz not null default now()
);
create index certificates_student_idx on public.certificates (student_id, issued_on desc);
create index certificates_halaqa_idx on public.certificates (halaqa_id);
alter table public.certificates enable row level security;
create policy certificates_select on public.certificates
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or private.is_parent_of(student_id)
    or (halaqa_id is not null and private.is_halaqa_staff(halaqa_id))
    or private.is_platform_admin()
  );
revoke insert, update, delete on public.certificates from authenticated;

create or replace function public.issue_certificate(
  p_student uuid, p_halaqa uuid, p_kind public.certificate_kind, p_title text,
  p_title_en text default null, p_description text default null
) returns text language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_serial text;
  v_id uuid;
  i integer;
begin
  if not private.is_halaqa_staff(p_halaqa, v_uid) then
    raise exception 'لا تملك صلاحية إصدار شهادات لهذه الحلقة' using errcode = '42501';
  end if;
  if not private.is_halaqa_student(p_halaqa, p_student) then
    raise exception 'الطالب ليس عضوًا نشطًا في الحلقة' using errcode = 'P0001';
  end if;
  if not private.consume_rate_limit('certificate:' || v_uid, 100, 86400) then
    raise exception 'تجاوزت الحد اليومي لإصدار الشهادات' using errcode = 'P0001';
  end if;
  loop
    v_bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    v_serial := 'HQ-' || to_char(current_date, 'YYYY') || '-';
    for i in 0..7 loop
      v_serial := v_serial || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.certificates where serial = v_serial);
  end loop;
  insert into public.certificates (serial, student_id, halaqa_id, issued_by, kind, title, title_en, description)
  values (v_serial, p_student, p_halaqa, v_uid, p_kind, btrim(p_title), nullif(btrim(p_title_en), ''), nullif(btrim(p_description), ''))
  returning id into v_id;
  perform private.notify(p_student, 'certificate.issued', 'مبارك! حصلت على شهادة: ' || btrim(p_title), null, '/dashboard/certificates');
  perform private.audit('certificate.issued', 'certificate', v_id,
                        jsonb_build_object('serial', v_serial, 'student_id', p_student, 'halaqa_id', p_halaqa));
  return v_serial;
end $$;

create or replace function public.revoke_certificate(p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_c public.certificates;
begin
  select * into v_c from public.certificates where id = p_id and revoked_at is null;
  if v_c.id is null or not (
       (v_c.halaqa_id is not null and private.is_halaqa_manager(v_c.halaqa_id)) or private.is_platform_admin()) then
    raise exception 'الشهادة غير موجودة' using errcode = 'P0002';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 5 then
    raise exception 'اذكر سبب الإلغاء' using errcode = '22023';
  end if;
  update public.certificates set revoked_at = now(), revoke_reason = btrim(p_reason) where id = p_id;
  perform private.audit('certificate.revoked', 'certificate', p_id, jsonb_build_object('reason', p_reason));
end $$;

create or replace function public.set_certificate_name_visibility(p_id uuid, p_show boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.certificates set show_name_publicly = p_show
   where id = p_id and student_id = auth.uid();
  if not found then raise exception 'الشهادة غير موجودة' using errcode = 'P0002'; end if;
end $$;

-- Public verification by serial. Name is masked unless the holder opted in.
create or replace function public.verify_certificate(p_serial text)
returns table (serial text, title text, title_en text, kind public.certificate_kind, description text,
               holder_name text, teacher_name text, teacher_verified boolean, halaqa_name text,
               issued_on date, is_valid boolean, revoked_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.serial, c.title, c.title_en, c.kind, c.description,
         case when c.show_name_publicly then coalesce(s.display_name, s.full_name)
              else left(coalesce(s.display_name, s.full_name), 1) || '***' end,
         coalesce(t.display_name, t.full_name),
         t.verified_teacher_at is not null,
         h.name,
         c.issued_on,
         c.revoked_at is null,
         c.revoked_at
  from public.certificates c
  join public.profiles s on s.id = c.student_id
  left join public.profiles t on t.id = c.issued_by
  left join public.halaqat h on h.id = c.halaqa_id
  where c.serial = upper(btrim(p_serial))
$$;

-- ---------------------------------------------------------------------
-- Support tickets & reports
-- ---------------------------------------------------------------------
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category public.ticket_category not null,
  subject text not null check (char_length(btrim(subject)) between 3 and 150),
  body text not null check (char_length(btrim(body)) between 10 and 3000),
  related_path text check (related_path is null or (related_path ~ '^/' and char_length(related_path) <= 300)),
  status public.ticket_status not null default 'open',
  admin_reply text check (admin_reply is null or char_length(admin_reply) <= 3000),
  handled_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index support_tickets_user_idx on public.support_tickets (user_id, created_at desc);
create index support_tickets_open_idx on public.support_tickets (status, created_at desc);
create trigger support_tickets_updated_at before update on public.support_tickets
  for each row execute function private.set_updated_at();
alter table public.support_tickets enable row level security;
create policy support_tickets_select on public.support_tickets
  for select to authenticated using (user_id = (select auth.uid()) or private.is_platform_admin());
revoke insert, update, delete on public.support_tickets from authenticated;

create or replace function public.create_support_ticket(
  p_category public.ticket_category, p_subject text, p_body text, p_related_path text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'يجب تسجيل الدخول' using errcode = '42501'; end if;
  if not private.consume_rate_limit('ticket:' || v_uid, 10, 86400) then
    raise exception 'تجاوزت الحد اليومي للبلاغات' using errcode = 'P0001';
  end if;
  insert into public.support_tickets (user_id, category, subject, body, related_path)
  values (v_uid, p_category, btrim(p_subject), btrim(p_body), nullif(btrim(p_related_path), ''))
  returning id into v_id;
  perform private.audit('ticket.created', 'support_ticket', v_id, jsonb_build_object('category', p_category));
  return v_id;
end $$;

create or replace function public.admin_update_ticket(p_id uuid, p_status public.ticket_status, p_reply text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_t public.support_tickets;
begin
  if not private.is_platform_admin() then raise exception 'صلاحية غير كافية' using errcode = '42501'; end if;
  select * into v_t from public.support_tickets where id = p_id for update;
  if v_t.id is null then raise exception 'البلاغ غير موجود' using errcode = 'P0002'; end if;
  update public.support_tickets
     set status = p_status, admin_reply = coalesce(nullif(btrim(p_reply), ''), admin_reply), handled_by = auth.uid()
   where id = p_id;
  if nullif(btrim(p_reply), '') is not null or p_status in ('resolved', 'closed') then
    perform private.notify(v_t.user_id, 'ticket.updated', 'رد على بلاغك: ' || v_t.subject, nullif(btrim(p_reply), ''), '/dashboard/support');
  end if;
  perform private.audit('ticket.updated', 'support_ticket', p_id, jsonb_build_object('status', p_status));
end $$;

create or replace function public.admin_list_tickets(p_status public.ticket_status default null, p_limit integer default 50)
returns table (id uuid, user_id uuid, full_name text, email text, category public.ticket_category, subject text,
               body text, related_path text, status public.ticket_status, admin_reply text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then raise exception 'صلاحية غير كافية' using errcode = '42501'; end if;
  return query
  select t.id, t.user_id, p.full_name, u.email::text, t.category, t.subject, t.body, t.related_path, t.status, t.admin_reply, t.created_at
  from public.support_tickets t
  join public.profiles p on p.id = t.user_id
  join auth.users u on u.id = t.user_id
  where p_status is null or t.status = p_status
  order by (t.status in ('open', 'in_progress')) desc, (t.category = 'report_abuse') desc, t.created_at desc
  limit least(greatest(p_limit, 1), 100);
end $$;

-- ---------------------------------------------------------------------
-- Weekly commitment streak (private to the student, parents, staff)
-- Consecutive weeks (ending this week or last) with an approved
-- recitation or a present/late attendance.
-- ---------------------------------------------------------------------
create or replace function public.get_student_streak(p_student uuid, p_halaqa uuid default null)
returns integer language plpgsql stable security definer set search_path = '' as $$
declare
  v_week date := date_trunc('week', current_date)::date;
  v_streak integer := 0;
  v_active boolean;
begin
  if not (auth.uid() = p_student or private.is_parent_of(p_student)
          or (p_halaqa is not null and private.is_halaqa_staff(p_halaqa))) then
    raise exception 'لا تملك صلاحية عرض بيانات هذا الطالب' using errcode = '42501';
  end if;
  -- The current week counts only once it has activity; otherwise start from last week.
  for i in 0..104 loop
    select exists (
      select 1 from public.quran_progress_records r
      where r.student_id = p_student and r.status = 'approved'
        and (p_halaqa is null or r.halaqa_id = p_halaqa)
        and date_trunc('week', r.recorded_on)::date = v_week
    ) or exists (
      select 1 from public.attendance_records a
      join public.quran_sessions s on s.id = a.session_id
      where a.student_id = p_student and a.status in ('present', 'late')
        and (p_halaqa is null or a.halaqa_id = p_halaqa)
        and date_trunc('week', s.starts_at)::date = v_week
    ) into v_active;
    if v_active then
      v_streak := v_streak + 1;
    elsif i > 0 then
      exit;
    end if;
    v_week := v_week - 7;
  end loop;
  return v_streak;
end $$;

-- ---------------------------------------------------------------------
-- Teacher's students table (one query, staff only)
-- ---------------------------------------------------------------------
create or replace function public.get_halaqa_student_table(p_halaqa uuid, p_days integer default 30)
returns table (
  student_id uuid, name text, joined_at timestamptz,
  sessions_marked bigint, sessions_attended bigint,
  memorized_ayat bigint, reviewed_ayat_period bigint,
  mastery_avg numeric, recitation_avg numeric,
  last_recorded_on date, open_assignment text, open_assignment_due date
) language plpgsql stable security definer set search_path = '' as $$
declare v_since date := current_date - greatest(least(p_days, 365), 1);
begin
  if not private.is_halaqa_staff(p_halaqa) then
    raise exception 'لا تملك صلاحية عرض طلاب هذه الحلقة' using errcode = '42501';
  end if;
  return query
  select m.user_id,
         coalesce(p.display_name, p.full_name),
         m.joined_at,
         (select count(*) from public.attendance_records a where a.halaqa_id = p_halaqa and a.student_id = m.user_id and a.created_at >= v_since),
         (select count(*) from public.attendance_records a where a.halaqa_id = p_halaqa and a.student_id = m.user_id and a.created_at >= v_since and a.status in ('present', 'late')),
         (select coalesce(sum(r.ayah_count), 0) from public.quran_progress_records r where r.halaqa_id = p_halaqa and r.student_id = m.user_id and r.status = 'approved' and r.activity = 'new_memorization' and r.completion = 'completed'),
         (select coalesce(sum(r.ayah_count), 0) from public.quran_progress_records r where r.halaqa_id = p_halaqa and r.student_id = m.user_id and r.status = 'approved' and r.activity <> 'new_memorization' and r.completion <> 'not_completed' and r.recorded_on >= v_since),
         (select round(avg(r.mastery_score)::numeric, 1) from public.quran_progress_records r where r.halaqa_id = p_halaqa and r.student_id = m.user_id and r.status = 'approved' and r.recorded_on >= v_since),
         (select round(avg(r.recitation_score)::numeric, 1) from public.quran_progress_records r where r.halaqa_id = p_halaqa and r.student_id = m.user_id and r.status = 'approved' and r.recorded_on >= v_since),
         (select max(r.recorded_on) from public.quran_progress_records r where r.halaqa_id = p_halaqa and r.student_id = m.user_id and r.status = 'approved'),
         (select sf.name_ar || ' ' || q.ayah_from || ' – ' || st.name_ar || ' ' || q.ayah_to
            from public.quran_assignments q
            join public.quran_surahs sf on sf.number = q.surah_from
            join public.quran_surahs st on st.number = q.surah_to
           where q.halaqa_id = p_halaqa and q.student_id = m.user_id and q.status = 'assigned'
           order by q.due_on nulls last limit 1),
         (select q.due_on from public.quran_assignments q
           where q.halaqa_id = p_halaqa and q.student_id = m.user_id and q.status = 'assigned'
           order by q.due_on nulls last limit 1)
  from public.halaqa_memberships m
  join public.profiles p on p.id = m.user_id
  where m.halaqa_id = p_halaqa and m.role = 'student' and m.status = 'active'
  order by coalesce(p.display_name, p.full_name);
end $$;

-- ---------------------------------------------------------------------
-- Public browse functions now expose the teacher ✓ flag
-- ---------------------------------------------------------------------
drop function public.get_public_halaqat(text, public.meeting_mode, public.halaqa_level, public.audience_gender, integer, integer);
create function public.get_public_halaqat(
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
  where h.status = 'published' and h.deleted_at is null
    and (h.center_id is null or (c.deleted_at is null and c.status <> 'suspended'))
    and (p_search is null or p_search = '' or h.name ilike '%' || p_search || '%'
         or h.description ilike '%' || p_search || '%' or h.location_text ilike '%' || p_search || '%')
    and (p_mode is null or h.meeting_mode = p_mode)
    and (p_level is null or h.level = p_level or h.level = 'all')
    and (p_gender is null or h.audience_gender = p_gender or h.audience_gender = 'mixed')
  order by (p.verified_teacher_at is not null) desc, h.created_at desc
  limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0)
$$;

drop function public.get_public_halaqa(uuid);
create function public.get_public_halaqa(p_id uuid)
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
  where h.id = p_id and h.status = 'published' and h.deleted_at is null
    and (h.center_id is null or (c.deleted_at is null and c.status <> 'suspended'))
$$;

drop function public.get_public_teachers(text, integer, integer);
create function public.get_public_teachers(p_search text default null, p_limit integer default 20, p_offset integer default 0)
returns table (id uuid, name text, bio text, avatar_url text, roles public.app_role[], verified boolean, published_halaqat bigint, total_count bigint)
language sql stable security definer set search_path = '' as $$
  select p.id, coalesce(p.display_name, p.full_name), p.bio, p.avatar_url,
         array(select r.role from public.user_roles r
               where r.user_id = p.id and r.revoked_at is null and r.role in ('quran_teacher', 'instructor')
               order by r.role),
         p.verified_teacher_at is not null,
         (select count(*) from public.halaqat h where h.teacher_id = p.id and h.status = 'published' and h.deleted_at is null),
         count(*) over ()
  from public.profiles p
  where p.directory_visible and p.deleted_at is null
    and exists (select 1 from public.user_roles r where r.user_id = p.id and r.revoked_at is null
                and r.role in ('quran_teacher', 'instructor'))
    and (p_search is null or p_search = '' or p.full_name ilike '%' || p_search || '%'
         or p.display_name ilike '%' || p_search || '%')
  order by (p.verified_teacher_at is not null) desc, p.created_at
  limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0)
$$;

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

grant execute on function
  public.submit_teacher_verification(text, text),
  public.admin_review_verification(uuid, boolean, text),
  public.admin_revoke_teacher_verification(uuid, text),
  public.admin_list_verification_requests(integer),
  public.issue_certificate(uuid, uuid, public.certificate_kind, text, text, text),
  public.revoke_certificate(uuid, text),
  public.set_certificate_name_visibility(uuid, boolean),
  public.create_support_ticket(public.ticket_category, text, text, text),
  public.admin_update_ticket(uuid, public.ticket_status, text),
  public.admin_list_tickets(public.ticket_status, integer),
  public.get_student_streak(uuid, uuid),
  public.get_halaqa_student_table(uuid, integer)
to authenticated;
grant execute on function
  public.get_public_halaqat(text, public.meeting_mode, public.halaqa_level, public.audience_gender, integer, integer),
  public.get_public_halaqa(uuid),
  public.get_public_teachers(text, integer, integer),
  public.get_public_centers(text, integer, integer),
  public.verify_certificate(text)
to anon, authenticated;
