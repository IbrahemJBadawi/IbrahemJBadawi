-- =====================================================================
-- Halaqati — Migration 0200: Quran halaqat
-- Halaqat, membership/join requests, sessions, attendance, memorization
-- and review records, recitation errors, assignments.
--
-- Design notes
--  * An independent halaqa has center_id = NULL. It never needs a fake
--    "default" center.
--  * Five separate signals are tracked and never merged into one score:
--    amount (ayah_count), mastery (mastery_score), recitation quality
--    (recitation_score), plan adherence (plan_adherence), attendance
--    (attendance_records).
--  * Approved records are immutable unless amended through
--    amend_progress_record(), which requires a reason and writes an
--    audit entry with the before/after values.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Reference: surahs
-- ---------------------------------------------------------------------
create table public.quran_surahs (
  number smallint primary key check (number between 1 and 114),
  name_ar text not null,
  ayah_count smallint not null check (ayah_count > 0)
);
alter table public.quran_surahs enable row level security;
create policy quran_surahs_read on public.quran_surahs for select to anon, authenticated using (true);
revoke insert, update, delete, truncate on public.quran_surahs from anon, authenticated;
grant select on public.quran_surahs to anon;

insert into public.quran_surahs (number, name_ar, ayah_count) values
(1,'الفاتحة',7),
(2,'البقرة',286),
(3,'آل عمران',200),
(4,'النساء',176),
(5,'المائدة',120),
(6,'الأنعام',165),
(7,'الأعراف',206),
(8,'الأنفال',75),
(9,'التوبة',129),
(10,'يونس',109),
(11,'هود',123),
(12,'يوسف',111),
(13,'الرعد',43),
(14,'إبراهيم',52),
(15,'الحجر',99),
(16,'النحل',128),
(17,'الإسراء',111),
(18,'الكهف',110),
(19,'مريم',98),
(20,'طه',135),
(21,'الأنبياء',112),
(22,'الحج',78),
(23,'المؤمنون',118),
(24,'النور',64),
(25,'الفرقان',77),
(26,'الشعراء',227),
(27,'النمل',93),
(28,'القصص',88),
(29,'العنكبوت',69),
(30,'الروم',60),
(31,'لقمان',34),
(32,'السجدة',30),
(33,'الأحزاب',73),
(34,'سبأ',54),
(35,'فاطر',45),
(36,'يس',83),
(37,'الصافات',182),
(38,'ص',88),
(39,'الزمر',75),
(40,'غافر',85),
(41,'فصلت',54),
(42,'الشورى',53),
(43,'الزخرف',89),
(44,'الدخان',59),
(45,'الجاثية',37),
(46,'الأحقاف',35),
(47,'محمد',38),
(48,'الفتح',29),
(49,'الحجرات',18),
(50,'ق',45),
(51,'الذاريات',60),
(52,'الطور',49),
(53,'النجم',62),
(54,'القمر',55),
(55,'الرحمن',78),
(56,'الواقعة',96),
(57,'الحديد',29),
(58,'المجادلة',22),
(59,'الحشر',24),
(60,'الممتحنة',13),
(61,'الصف',14),
(62,'الجمعة',11),
(63,'المنافقون',11),
(64,'التغابن',18),
(65,'الطلاق',12),
(66,'التحريم',12),
(67,'الملك',30),
(68,'القلم',52),
(69,'الحاقة',52),
(70,'المعارج',44),
(71,'نوح',28),
(72,'الجن',28),
(73,'المزمل',20),
(74,'المدثر',56),
(75,'القيامة',40),
(76,'الإنسان',31),
(77,'المرسلات',50),
(78,'النبأ',40),
(79,'النازعات',46),
(80,'عبس',42),
(81,'التكوير',29),
(82,'الانفطار',19),
(83,'المطففين',36),
(84,'الانشقاق',25),
(85,'البروج',22),
(86,'الطارق',17),
(87,'الأعلى',19),
(88,'الغاشية',26),
(89,'الفجر',30),
(90,'البلد',20),
(91,'الشمس',15),
(92,'الليل',21),
(93,'الضحى',11),
(94,'الشرح',8),
(95,'التين',8),
(96,'العلق',19),
(97,'القدر',5),
(98,'البينة',8),
(99,'الزلزلة',8),
(100,'العاديات',11),
(101,'القارعة',11),
(102,'التكاثر',8),
(103,'العصر',3),
(104,'الهمزة',9),
(105,'الفيل',5),
(106,'قريش',4),
(107,'الماعون',7),
(108,'الكوثر',3),
(109,'الكافرون',6),
(110,'النصر',3),
(111,'المسد',5),
(112,'الإخلاص',4),
(113,'الفلق',5),
(114,'الناس',6)
;

-- Validates a mushaf-ordered range and returns its ayah count.
create or replace function private.quran_range_count(
  p_surah_from smallint, p_ayah_from smallint, p_surah_to smallint, p_ayah_to smallint
) returns integer language plpgsql stable security definer set search_path = '' as $$
declare v_from smallint; v_to smallint; v_count integer;
begin
  select ayah_count into v_from from public.quran_surahs where number = p_surah_from;
  select ayah_count into v_to from public.quran_surahs where number = p_surah_to;
  if v_from is null or v_to is null then
    raise exception 'رقم السورة غير صحيح' using errcode = '22023';
  end if;
  if p_ayah_from < 1 or p_ayah_from > v_from or p_ayah_to < 1 or p_ayah_to > v_to then
    raise exception 'رقم الآية خارج حدود السورة' using errcode = '22023';
  end if;
  if p_surah_to < p_surah_from or (p_surah_to = p_surah_from and p_ayah_to < p_ayah_from) then
    raise exception 'يجب أن تكون نهاية المقطع بعد بدايته في ترتيب المصحف' using errcode = '22023';
  end if;
  if p_surah_from = p_surah_to then
    return p_ayah_to - p_ayah_from + 1;
  end if;
  select (v_from - p_ayah_from + 1) + coalesce(sum(ayah_count), 0) + p_ayah_to
    into v_count
  from public.quran_surahs where number > p_surah_from and number < p_surah_to;
  return v_count;
end $$;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.halaqa_status as enum ('draft', 'published', 'completed', 'paused');
create type public.halaqa_join_policy as enum ('open', 'approval', 'invite_only');
create type public.meeting_mode as enum ('in_person', 'remote', 'hybrid');
create type public.halaqa_level as enum ('beginner', 'intermediate', 'advanced', 'all');
create type public.audience_gender as enum ('male', 'female', 'mixed');
create type public.halaqa_member_role as enum ('teacher', 'assistant', 'student');
create type public.session_status as enum ('scheduled', 'completed', 'cancelled');
create type public.attendance_status as enum ('present', 'late', 'absent', 'excused');
create type public.quran_activity as enum ('new_memorization', 'near_review', 'far_review');
create type public.completion_status as enum ('completed', 'partial', 'not_completed');
create type public.plan_adherence as enum ('met', 'partial', 'missed', 'no_plan');
create type public.record_status as enum ('draft', 'approved');
create type public.recitation_error_type as enum (
  'memorization', 'tajweed', 'pronunciation', 'waqf_ibtida', 'hesitation', 'other'
);
create type public.assignment_status as enum (
  'assigned', 'completed', 'partially_completed', 'missed', 'cancelled'
);

-- ---------------------------------------------------------------------
-- Halaqat
-- ---------------------------------------------------------------------
create table public.halaqat (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 3 and 120),
  description text check (description is null or char_length(description) <= 2000),
  teacher_id uuid not null references public.profiles (id) on delete restrict,
  center_id uuid references public.centers (id) on delete restrict,
  is_independent boolean generated always as (center_id is null) stored,
  audience_gender public.audience_gender not null default 'mixed',
  age_min smallint check (age_min is null or age_min between 3 and 120),
  age_max smallint check (age_max is null or age_max between 3 and 120),
  level public.halaqa_level not null default 'all',
  max_students smallint not null default 20 check (max_students between 1 and 300),
  meeting_mode public.meeting_mode not null default 'remote',
  -- Public, coarse location only (city / district). Never a home address.
  location_text text check (location_text is null or char_length(location_text) <= 200),
  -- [{ "day": 0-6 (0 = Sunday), "start": "HH:MM", "duration": minutes }]
  schedule jsonb not null default '[]'::jsonb check (jsonb_typeof(schedule) = 'array' and jsonb_array_length(schedule) <= 14),
  timezone text not null default 'Asia/Riyadh' check (char_length(timezone) <= 60),
  status public.halaqa_status not null default 'draft',
  join_policy public.halaqa_join_policy not null default 'approval',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (age_min is null or age_max is null or age_min <= age_max)
);
create index halaqat_public_idx on public.halaqat (status, created_at desc) where deleted_at is null;
create index halaqat_teacher_idx on public.halaqat (teacher_id) where deleted_at is null;
create index halaqat_center_idx on public.halaqat (center_id) where deleted_at is null;
create trigger halaqat_updated_at before update on public.halaqat
  for each row execute function private.set_updated_at();

create table public.halaqa_memberships (
  id uuid primary key default gen_random_uuid(),
  halaqa_id uuid not null references public.halaqat (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.halaqa_member_role not null,
  status public.membership_status not null,
  request_message text check (request_message is null or char_length(request_message) <= 500),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  decision_note text check (decision_note is null or char_length(decision_note) <= 500),
  joined_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index halaqa_memberships_open_unique
  on public.halaqa_memberships (halaqa_id, user_id) where status in ('pending', 'active');
create index halaqa_memberships_user_idx on public.halaqa_memberships (user_id, status);
create index halaqa_memberships_halaqa_idx on public.halaqa_memberships (halaqa_id, status, role);
create trigger halaqa_memberships_updated_at before update on public.halaqa_memberships
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- Halaqa authorization helpers
-- ---------------------------------------------------------------------
-- Manager: responsible teacher, or admin of the owning center/organization.
create or replace function private.is_halaqa_manager(p_halaqa uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.halaqat h
    where h.id = p_halaqa and h.deleted_at is null
      and (h.teacher_id = p_user or private.is_center_admin(h.center_id, p_user))
  )
$$;

-- Staff: managers plus active assistant/teacher members.
create or replace function private.is_halaqa_staff(p_halaqa uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_halaqa_manager(p_halaqa, p_user) or exists (
    select 1 from public.halaqa_memberships m
    join public.halaqat h on h.id = m.halaqa_id and h.deleted_at is null
    where m.halaqa_id = p_halaqa and m.user_id = p_user
      and m.status = 'active' and m.role in ('teacher', 'assistant')
  )
$$;

create or replace function private.is_halaqa_student(p_halaqa uuid, p_student uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.halaqa_memberships m
    where m.halaqa_id = p_halaqa and m.user_id = p_student
      and m.status = 'active' and m.role = 'student'
  )
$$;

-- Pending or active participant (any role).
create or replace function private.is_halaqa_participant(p_halaqa uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.halaqa_memberships m
    where m.halaqa_id = p_halaqa and m.user_id = p_user and m.status in ('pending', 'active')
  )
$$;

-- A linked parent of an active student of the halaqa.
create or replace function private.is_parent_in_halaqa(p_halaqa uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.halaqa_memberships m
    join public.parent_student_links l
      on l.student_id = m.user_id and l.parent_id = p_user and l.status = 'active'
    where m.halaqa_id = p_halaqa and m.status = 'active' and m.role = 'student'
  )
$$;

-- Who may see a student's Quran records.
create or replace function private.can_view_student(p_student uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select p_user is not null and (
    p_student = p_user
    or private.is_parent_of(p_student, p_user)
    or exists (
      select 1 from public.halaqa_memberships m
      where m.user_id = p_student and m.status in ('pending', 'active') and m.role = 'student'
        and private.is_halaqa_staff(m.halaqa_id, p_user)
    )
    or exists (
      select 1 from public.center_memberships cm
      where cm.user_id = p_student and cm.status = 'active'
        and private.is_center_admin(cm.center_id, p_user)
    )
  )
$$;

-- Who may see someone's basic profile (name, bio, avatar).
create or replace function private.can_view_profile(p_target uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select p_user is not null and (
    p_target = p_user
    or private.can_view_student(p_target, p_user)
    or private.is_parent_of(p_user, p_target)
    -- students/parents see the staff of halaqat they belong to
    or exists (
      select 1 from public.halaqat h
      where h.deleted_at is null
        and (h.teacher_id = p_target or exists (
              select 1 from public.halaqa_memberships s
              where s.halaqa_id = h.id and s.user_id = p_target
                and s.status = 'active' and s.role in ('teacher', 'assistant')))
        and (private.is_halaqa_participant(h.id, p_user) or private.is_parent_in_halaqa(h.id, p_user))
    )
    -- institution admins see their members; members see their admins
    or exists (
      select 1 from public.center_memberships cm
      where cm.user_id = p_target and cm.status = 'active'
        and (private.is_center_admin(cm.center_id, p_user)
             or (cm.role = 'admin' and private.is_center_member(cm.center_id, p_user)))
    )
    or exists (
      select 1 from public.organization_memberships om
      where om.user_id = p_target and om.status = 'active'
        and private.is_org_admin(om.organization_id, p_user)
    )
    or exists (
      select 1 from public.profiles p
      where p.id = p_target and p.directory_visible and p.deleted_at is null
    )
    or private.is_platform_admin()
  )
$$;

-- Widen profile visibility now that halaqat exist.
drop policy profiles_select_family on public.profiles;
create policy profiles_select_related on public.profiles
  for select to authenticated
  using (private.can_view_profile(id));

-- Teachers/admins need age & gender for placement; nobody else.
drop policy profile_details_select_self on public.profile_details;
create policy profile_details_select on public.profile_details
  for select to authenticated
  using (private.can_view_student(user_id));

-- ---------------------------------------------------------------------
-- Halaqa triggers
-- ---------------------------------------------------------------------
create or replace function private.halaqat_before_insert()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.created_by := coalesce(auth.uid(), new.created_by);
  if new.join_policy = 'invite_only' then
    -- Invitations ship with the institutions phase; until then this policy
    -- would make a halaqa impossible to join.
    raise exception 'سياسة الانضمام بالدعوة غير متاحة بعد' using errcode = '0A000';
  end if;
  return new;
end $$;
create trigger halaqat_before_insert before insert on public.halaqat
  for each row execute function private.halaqat_before_insert();

create or replace function private.halaqat_before_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  if new.join_policy = 'invite_only' and old.join_policy <> 'invite_only' then
    raise exception 'سياسة الانضمام بالدعوة غير متاحة بعد' using errcode = '0A000';
  end if;
  return new;
end $$;
create trigger halaqat_before_update before update on public.halaqat
  for each row execute function private.halaqat_before_update();

-- Keep the responsible teacher's membership row in sync.
create or replace function private.halaqat_sync_teacher()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.teacher_id is not distinct from old.teacher_id then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    update public.halaqa_memberships set status = 'removed', ended_at = now()
     where halaqa_id = new.id and user_id = old.teacher_id and role = 'teacher' and status = 'active';
  end if;
  insert into public.halaqa_memberships (halaqa_id, user_id, role, status, joined_at, decided_by, decided_at)
  values (new.id, new.teacher_id, 'teacher', 'active', now(), auth.uid(), now())
  on conflict (halaqa_id, user_id) where status in ('pending', 'active')
  do update set role = 'teacher', status = 'active', joined_at = coalesce(public.halaqa_memberships.joined_at, now());
  perform private.audit(case when tg_op = 'INSERT' then 'halaqa.created' else 'halaqa.teacher_changed' end,
                        'halaqa', new.id, jsonb_build_object('teacher_id', new.teacher_id), null, new.center_id);
  return new;
end $$;
create trigger halaqat_sync_teacher after insert or update of teacher_id on public.halaqat
  for each row execute function private.halaqat_sync_teacher();

-- ---------------------------------------------------------------------
-- Halaqa RLS
-- ---------------------------------------------------------------------
alter table public.halaqat enable row level security;
alter table public.halaqa_memberships enable row level security;

create policy halaqat_select on public.halaqat
  for select to authenticated
  using (
    (status = 'published' and deleted_at is null)
    -- Direct column checks so a just-inserted row is visible to its creator.
    or teacher_id = (select auth.uid())
    or private.is_center_admin(center_id)
    or private.is_halaqa_staff(id)
    or private.is_halaqa_participant(id)
    or private.is_parent_in_halaqa(id)
  );

-- Independent teacher creating their own halaqa, or a center admin
-- creating one for a teacher of that center.
create policy halaqat_insert on public.halaqat
  for insert to authenticated
  with check (
    deleted_at is null and (
      (teacher_id = (select auth.uid())
        and private.has_role('quran_teacher')
        and (center_id is null
             or private.has_center_role(center_id, 'teacher')
             or private.is_center_admin(center_id)))
      or (center_id is not null
        and private.is_center_admin(center_id)
        and private.has_center_role(center_id, 'teacher', teacher_id))
    )
  );

create policy halaqat_update on public.halaqat
  for update to authenticated
  using (private.is_halaqa_manager(id))
  with check (
    (teacher_id = (select auth.uid())
      and (center_id is null
           or private.has_center_role(center_id, 'teacher')
           or private.is_center_admin(center_id)))
    or (center_id is not null
      and private.is_center_admin(center_id)
      and private.has_center_role(center_id, 'teacher', teacher_id))
  );
revoke delete on public.halaqat from authenticated;

create policy halaqa_memberships_select on public.halaqa_memberships
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_halaqa_staff(halaqa_id)
    or private.is_parent_of(user_id)
  );
revoke insert, update, delete on public.halaqa_memberships from authenticated;

-- ---------------------------------------------------------------------
-- Membership RPCs
-- ---------------------------------------------------------------------
create or replace function private.halaqa_active_students(p_halaqa uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.halaqa_memberships
  where halaqa_id = p_halaqa and role = 'student' and status = 'active'
$$;

create or replace function private.notify_halaqa_managers(
  p_halaqa uuid, p_kind text, p_title text, p_body text, p_link text
) returns void language plpgsql security definer set search_path = '' as $$
declare v_teacher uuid;
begin
  select teacher_id into v_teacher from public.halaqat where id = p_halaqa;
  if v_teacher is not null then
    perform private.notify(v_teacher, p_kind, p_title, p_body, p_link);
  end if;
end $$;

create or replace function public.request_join_halaqa(p_halaqa uuid, p_message text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_h public.halaqat;
  v_status public.membership_status;
  v_id uuid;
  v_name text;
begin
  if v_uid is null then raise exception 'يجب تسجيل الدخول' using errcode = '42501'; end if;
  if not private.has_role('student', v_uid) then
    raise exception 'أضف دور الطالب إلى حسابك للانضمام إلى الحلقات' using errcode = '42501';
  end if;
  if not private.consume_rate_limit('join_halaqa:' || v_uid, 20, 3600) then
    raise exception 'طلبات كثيرة، حاول لاحقًا' using errcode = 'P0001';
  end if;
  select * into v_h from public.halaqat where id = p_halaqa and deleted_at is null for update;
  if v_h.id is null or v_h.status <> 'published' then
    raise exception 'الحلقة غير متاحة للانضمام' using errcode = 'P0002';
  end if;
  if v_h.teacher_id = v_uid then
    raise exception 'أنت المحفّظ المسؤول عن هذه الحلقة' using errcode = 'P0001';
  end if;
  if v_h.join_policy = 'invite_only' then
    raise exception 'الانضمام إلى هذه الحلقة بالدعوة فقط' using errcode = '42501';
  end if;
  if private.is_halaqa_participant(p_halaqa, v_uid) then
    raise exception 'لديك طلب قائم أو عضوية في هذه الحلقة' using errcode = '23505';
  end if;
  if private.halaqa_active_students(p_halaqa) >= v_h.max_students then
    raise exception 'اكتمل عدد طلاب الحلقة' using errcode = 'P0001';
  end if;

  v_status := case when v_h.join_policy = 'open' then 'active' else 'pending' end;
  insert into public.halaqa_memberships (halaqa_id, user_id, role, status, request_message, joined_at)
  values (p_halaqa, v_uid, 'student', v_status, nullif(btrim(p_message), ''),
          case when v_status = 'active' then now() end)
  returning id into v_id;

  select full_name into v_name from public.profiles where id = v_uid;
  perform private.notify_halaqa_managers(p_halaqa,
    case when v_status = 'active' then 'halaqa.student_joined' else 'halaqa.join_requested' end,
    case when v_status = 'active' then 'انضم طالب جديد إلى ' || v_h.name else 'طلب انضمام جديد إلى ' || v_h.name end,
    coalesce(v_name, ''), '/dashboard/teacher/halaqat/' || p_halaqa);
  perform private.audit('halaqa.join_requested', 'halaqa_membership', v_id,
                        jsonb_build_object('halaqa_id', p_halaqa, 'status', v_status), null, v_h.center_id);
  return jsonb_build_object('membership_id', v_id, 'status', v_status);
end $$;

create or replace function public.decide_join_request(p_membership uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_m public.halaqa_memberships;
  v_h public.halaqat;
begin
  select * into v_m from public.halaqa_memberships where id = p_membership for update;
  if v_m.id is null or not private.is_halaqa_staff(v_m.halaqa_id, v_uid) then
    raise exception 'الطلب غير موجود' using errcode = 'P0002';
  end if;
  if v_m.status <> 'pending' then
    raise exception 'تمت معالجة هذا الطلب مسبقًا' using errcode = 'P0001';
  end if;
  select * into v_h from public.halaqat where id = v_m.halaqa_id for update;
  if p_approve and private.halaqa_active_students(v_h.id) >= v_h.max_students then
    raise exception 'اكتمل عدد طلاب الحلقة' using errcode = 'P0001';
  end if;
  update public.halaqa_memberships
     set status = case when p_approve then 'active'::public.membership_status else 'rejected'::public.membership_status end,
         decided_by = v_uid, decided_at = now(), decision_note = nullif(btrim(p_note), ''),
         joined_at = case when p_approve then now() else null end
   where id = p_membership;
  perform private.notify(v_m.user_id,
    case when p_approve then 'halaqa.join_approved' else 'halaqa.join_rejected' end,
    case when p_approve then 'تم قبولك في ' || v_h.name else 'لم يتم قبول طلبك في ' || v_h.name end,
    nullif(btrim(p_note), ''), '/dashboard/halaqat');
  perform private.audit(case when p_approve then 'halaqa.join_approved' else 'halaqa.join_rejected' end,
                        'halaqa_membership', p_membership,
                        jsonb_build_object('halaqa_id', v_h.id, 'student_id', v_m.user_id), null, v_h.center_id);
end $$;

-- Student withdraws a pending request or leaves an active membership.
create or replace function public.leave_halaqa(p_halaqa uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  update public.halaqa_memberships set status = 'left', ended_at = now()
   where halaqa_id = p_halaqa and user_id = v_uid and role = 'student' and status in ('pending', 'active')
  returning id into v_id;
  if v_id is null then raise exception 'لا توجد عضوية قائمة' using errcode = 'P0002'; end if;
  perform private.audit('halaqa.left', 'halaqa_membership', v_id, jsonb_build_object('halaqa_id', p_halaqa));
end $$;

create or replace function public.remove_halaqa_member(p_membership uuid, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_m public.halaqa_memberships; v_name text;
begin
  select * into v_m from public.halaqa_memberships where id = p_membership for update;
  if v_m.id is null or not private.is_halaqa_manager(v_m.halaqa_id, v_uid) then
    raise exception 'العضوية غير موجودة' using errcode = 'P0002';
  end if;
  if v_m.role = 'teacher' then
    raise exception 'لا يمكن إزالة المحفّظ المسؤول؛ انقل المسؤولية أولًا' using errcode = 'P0001';
  end if;
  if v_m.status <> 'active' then
    raise exception 'العضوية غير نشطة' using errcode = 'P0001';
  end if;
  update public.halaqa_memberships
     set status = 'removed', ended_at = now(), decided_by = v_uid, decided_at = now(),
         decision_note = nullif(btrim(p_note), '')
   where id = p_membership;
  select name into v_name from public.halaqat where id = v_m.halaqa_id;
  perform private.notify(v_m.user_id, 'halaqa.member_removed', 'انتهت عضويتك في ' || coalesce(v_name, 'الحلقة'),
                         nullif(btrim(p_note), ''), '/dashboard/halaqat');
  perform private.audit('halaqa.member_removed', 'halaqa_membership', p_membership,
                        jsonb_build_object('halaqa_id', v_m.halaqa_id, 'user_id', v_m.user_id));
end $$;

-- ---------------------------------------------------------------------
-- Sessions
-- ---------------------------------------------------------------------
create table public.quran_sessions (
  id uuid primary key default gen_random_uuid(),
  halaqa_id uuid not null references public.halaqat (id) on delete cascade,
  starts_at timestamptz not null,
  duration_minutes smallint not null default 60 check (duration_minutes between 5 and 600),
  mode public.meeting_mode not null default 'remote',
  meeting_url text check (meeting_url is null or (meeting_url ~ '^https://' and char_length(meeting_url) <= 500)),
  location_text text check (location_text is null or char_length(location_text) <= 200),
  topic text check (topic is null or char_length(topic) <= 200),
  status public.session_status not null default 'scheduled',
  cancel_reason text check (cancel_reason is null or char_length(cancel_reason) <= 300),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quran_sessions_halaqa_idx on public.quran_sessions (halaqa_id, starts_at desc);
create index quran_sessions_starts_idx on public.quran_sessions (starts_at);
create trigger quran_sessions_updated_at before update on public.quran_sessions
  for each row execute function private.set_updated_at();

create or replace function private.quran_sessions_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
  else
    new.halaqa_id := old.halaqa_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;
create trigger quran_sessions_guard before insert or update on public.quran_sessions
  for each row execute function private.quran_sessions_guard();

alter table public.quran_sessions enable row level security;
create policy quran_sessions_select on public.quran_sessions
  for select to authenticated
  using (
    private.is_halaqa_staff(halaqa_id)
    or private.is_halaqa_student(halaqa_id)
    or private.is_parent_in_halaqa(halaqa_id)
  );
create policy quran_sessions_insert on public.quran_sessions
  for insert to authenticated with check (private.is_halaqa_staff(halaqa_id));
create policy quran_sessions_update on public.quran_sessions
  for update to authenticated
  using (private.is_halaqa_staff(halaqa_id))
  with check (private.is_halaqa_staff(halaqa_id));
revoke delete on public.quran_sessions from authenticated;

-- ---------------------------------------------------------------------
-- Attendance
-- ---------------------------------------------------------------------
create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.quran_sessions (id) on delete cascade,
  halaqa_id uuid not null references public.halaqat (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  status public.attendance_status not null,
  note text check (note is null or char_length(note) <= 300),
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, student_id)
);
create index attendance_student_idx on public.attendance_records (student_id, created_at desc);
create index attendance_halaqa_idx on public.attendance_records (halaqa_id);
create trigger attendance_updated_at before update on public.attendance_records
  for each row execute function private.set_updated_at();

create or replace function private.attendance_guard()
returns trigger language plpgsql set search_path = '' as $$
declare v_halaqa uuid;
begin
  select halaqa_id into v_halaqa from public.quran_sessions where id = new.session_id;
  if v_halaqa is null then raise exception 'الجلسة غير موجودة' using errcode = 'P0002'; end if;
  if tg_op = 'UPDATE' then
    new.session_id := old.session_id;
    new.student_id := old.student_id;
    new.created_at := old.created_at;
  elsif not private.is_halaqa_student(v_halaqa, new.student_id) then
    raise exception 'الطالب ليس عضوًا نشطًا في الحلقة' using errcode = 'P0001';
  end if;
  new.halaqa_id := v_halaqa;
  new.recorded_by := coalesce(auth.uid(), new.recorded_by);
  return new;
end $$;
create trigger attendance_guard before insert or update on public.attendance_records
  for each row execute function private.attendance_guard();

create or replace function private.attendance_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status is distinct from new.status then
    perform private.audit('attendance.changed', 'attendance_record', new.id,
      jsonb_build_object('from', old.status, 'to', new.status, 'student_id', new.student_id));
  end if;
  return new;
end $$;
create trigger attendance_audit after update on public.attendance_records
  for each row execute function private.attendance_audit();

alter table public.attendance_records enable row level security;
create policy attendance_select on public.attendance_records
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or private.is_parent_of(student_id)
    or private.is_halaqa_staff(halaqa_id)
  );
create policy attendance_insert on public.attendance_records
  for insert to authenticated
  with check (private.is_halaqa_staff((select s.halaqa_id from public.quran_sessions s where s.id = session_id)));
create policy attendance_update on public.attendance_records
  for update to authenticated
  using (private.is_halaqa_staff(halaqa_id))
  with check (private.is_halaqa_staff(halaqa_id));
revoke delete on public.attendance_records from authenticated;

-- Bulk save from the attendance sheet. Runs as the caller (RLS applies).
create or replace function public.save_attendance(p_session uuid, p_entries jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare v_entry jsonb; v_count integer := 0;
begin
  if jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) > 300 then
    raise exception 'بيانات الحضور غير صحيحة' using errcode = '22023';
  end if;
  for v_entry in select * from jsonb_array_elements(p_entries) loop
    insert into public.attendance_records (session_id, halaqa_id, student_id, status, note)
    values (p_session,
            (select halaqa_id from public.quran_sessions where id = p_session),
            (v_entry ->> 'student_id')::uuid,
            (v_entry ->> 'status')::public.attendance_status,
            nullif(btrim(v_entry ->> 'note'), ''))
    on conflict (session_id, student_id) do update
      set status = excluded.status, note = excluded.note;
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

-- ---------------------------------------------------------------------
-- Assignments (the "next homework")
-- ---------------------------------------------------------------------
create table public.quran_assignments (
  id uuid primary key default gen_random_uuid(),
  halaqa_id uuid not null references public.halaqat (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  activity public.quran_activity not null,
  surah_from smallint not null references public.quran_surahs (number),
  ayah_from smallint not null,
  surah_to smallint not null references public.quran_surahs (number),
  ayah_to smallint not null,
  ayah_count integer not null default 0,
  due_on date,
  instructions text check (instructions is null or char_length(instructions) <= 1000),
  status public.assignment_status not null default 'assigned',
  assigned_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quran_assignments_student_idx on public.quran_assignments (student_id, status, due_on);
create index quran_assignments_halaqa_idx on public.quran_assignments (halaqa_id, status);
create trigger quran_assignments_updated_at before update on public.quran_assignments
  for each row execute function private.set_updated_at();

create or replace function private.assignments_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if not private.is_halaqa_student(new.halaqa_id, new.student_id) then
      raise exception 'الطالب ليس عضوًا نشطًا في الحلقة' using errcode = 'P0001';
    end if;
    new.assigned_by := coalesce(auth.uid(), new.assigned_by);
  else
    new.halaqa_id := old.halaqa_id;
    new.student_id := old.student_id;
    new.assigned_by := old.assigned_by;
    new.created_at := old.created_at;
  end if;
  new.ayah_count := private.quran_range_count(new.surah_from, new.ayah_from, new.surah_to, new.ayah_to);
  return new;
end $$;
create trigger assignments_guard before insert or update on public.quran_assignments
  for each row execute function private.assignments_guard();

create or replace function private.assignments_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.notify(new.student_id, 'assignment.created', 'واجب جديد',
    (select name_ar from public.quran_surahs where number = new.surah_from)
      || ' ' || new.ayah_from || ' – '
      || (select name_ar from public.quran_surahs where number = new.surah_to) || ' ' || new.ayah_to,
    '/dashboard/plan');
  return new;
end $$;
create trigger assignments_notify after insert on public.quran_assignments
  for each row execute function private.assignments_notify();

alter table public.quran_assignments enable row level security;
create policy quran_assignments_select on public.quran_assignments
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or private.is_parent_of(student_id)
    or private.is_halaqa_staff(halaqa_id)
  );
create policy quran_assignments_insert on public.quran_assignments
  for insert to authenticated with check (private.is_halaqa_staff(halaqa_id));
create policy quran_assignments_update on public.quran_assignments
  for update to authenticated
  using (private.is_halaqa_staff(halaqa_id))
  with check (private.is_halaqa_staff(halaqa_id));
revoke delete on public.quran_assignments from authenticated;

-- ---------------------------------------------------------------------
-- Memorization / review records
-- ---------------------------------------------------------------------
create table public.quran_progress_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  halaqa_id uuid not null references public.halaqat (id) on delete cascade,
  session_id uuid references public.quran_sessions (id) on delete set null,
  assignment_id uuid references public.quran_assignments (id) on delete set null,
  activity public.quran_activity not null,
  surah_from smallint not null references public.quran_surahs (number),
  ayah_from smallint not null,
  surah_to smallint not null references public.quran_surahs (number),
  ayah_to smallint not null,
  ayah_count integer not null default 0,
  completion public.completion_status not null,
  mastery_score smallint check (mastery_score between 1 and 5),
  recitation_score smallint check (recitation_score between 1 and 5),
  plan_adherence public.plan_adherence not null default 'no_plan',
  teacher_notes text check (teacher_notes is null or char_length(teacher_notes) <= 2000),
  recorded_on date not null default current_date,
  status public.record_status not null default 'draft',
  approved_at timestamptz,
  approved_by uuid references public.profiles (id) on delete set null,
  revision integer not null default 1,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index progress_student_idx on public.quran_progress_records (student_id, recorded_on desc);
create index progress_halaqa_idx on public.quran_progress_records (halaqa_id, recorded_on desc);
create index progress_session_idx on public.quran_progress_records (session_id);
create trigger progress_updated_at before update on public.quran_progress_records
  for each row execute function private.set_updated_at();

create or replace function private.progress_before_write()
returns trigger language plpgsql set search_path = '' as $$
declare v_reason text := nullif(current_setting('halaqati.amend_reason', true), '');
begin
  if tg_op = 'INSERT' then
    if not private.is_halaqa_student(new.halaqa_id, new.student_id) then
      raise exception 'الطالب ليس عضوًا نشطًا في الحلقة' using errcode = 'P0001';
    end if;
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.revision := 1;
    new.approved_at := null;
    new.approved_by := null;
  else
    -- Identity of a record never changes.
    new.student_id := old.student_id;
    new.halaqa_id := old.halaqa_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.approved_at := old.approved_at;
    new.approved_by := old.approved_by;
    new.revision := old.revision;
    if old.status = 'approved' then
      if new.status <> 'approved' then
        raise exception 'لا يمكن إرجاع سجل معتمد إلى مسودة' using errcode = '42501';
      end if;
      if v_reason is null then
        raise exception 'تعديل سجل معتمد يتطلب ذكر سبب التعديل' using errcode = '42501';
      end if;
      new.revision := old.revision + 1;
    end if;
  end if;

  if new.session_id is not null and not exists (
    select 1 from public.quran_sessions s where s.id = new.session_id and s.halaqa_id = new.halaqa_id
  ) then
    raise exception 'الجلسة لا تتبع هذه الحلقة' using errcode = 'P0001';
  end if;
  if new.assignment_id is not null and not exists (
    select 1 from public.quran_assignments a
    where a.id = new.assignment_id and a.student_id = new.student_id and a.halaqa_id = new.halaqa_id
  ) then
    raise exception 'الواجب لا يخص هذا الطالب' using errcode = 'P0001';
  end if;
  if new.completion <> 'not_completed' and new.mastery_score is null then
    raise exception 'حدّد تقييم إتقان الحفظ' using errcode = '23514';
  end if;

  new.ayah_count := private.quran_range_count(new.surah_from, new.ayah_from, new.surah_to, new.ayah_to);
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status = 'draft') then
    new.approved_at := now();
    new.approved_by := auth.uid();
  end if;
  return new;
end $$;
create trigger progress_before_write before insert or update on public.quran_progress_records
  for each row execute function private.progress_before_write();

create or replace function private.progress_before_delete()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'approved' then
    raise exception 'لا يمكن حذف سجل معتمد' using errcode = '42501';
  end if;
  return old;
end $$;
create trigger progress_before_delete before delete on public.quran_progress_records
  for each row execute function private.progress_before_delete();

create or replace function private.progress_after_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_parent uuid; v_label text;
begin
  if tg_op = 'UPDATE' and old.status = 'approved' then
    perform private.audit('progress.amended', 'quran_progress_record', new.id,
      jsonb_build_object('reason', current_setting('halaqati.amend_reason', true),
                         'revision', new.revision,
                         'before', to_jsonb(old) - 'updated_at',
                         'after', to_jsonb(new) - 'updated_at'));
    return new;
  end if;

  if new.status = 'approved' and (tg_op = 'INSERT' or old.status = 'draft') then
    if new.assignment_id is not null then
      update public.quran_assignments
         set status = case new.completion
                        when 'completed' then 'completed'::public.assignment_status
                        when 'partial' then 'partially_completed'::public.assignment_status
                        else 'missed'::public.assignment_status end
       where id = new.assignment_id;
    end if;
    v_label := case new.activity when 'new_memorization' then 'حفظ جديد'
                                 when 'near_review' then 'مراجعة قريبة'
                                 else 'مراجعة بعيدة' end;
    perform private.notify(new.student_id, 'progress.approved', 'تم تسجيل ' || v_label, null, '/dashboard/journey');
    for v_parent in
      select parent_id from public.parent_student_links where student_id = new.student_id and status = 'active'
    loop
      perform private.notify(v_parent, 'progress.approved',
        'تم تسجيل ' || v_label || ' لـ ' || (select full_name from public.profiles where id = new.student_id),
        null, '/dashboard/children/' || new.student_id);
    end loop;
    perform private.audit('progress.approved', 'quran_progress_record', new.id,
      jsonb_build_object('student_id', new.student_id, 'halaqa_id', new.halaqa_id));
  end if;
  return new;
end $$;
create trigger progress_after_write after insert or update on public.quran_progress_records
  for each row execute function private.progress_after_write();

alter table public.quran_progress_records enable row level security;
-- Students and parents only ever see approved records.
create policy progress_select on public.quran_progress_records
  for select to authenticated
  using (
    private.is_halaqa_staff(halaqa_id)
    or (status = 'approved' and (student_id = (select auth.uid()) or private.is_parent_of(student_id)))
  );
create policy progress_insert on public.quran_progress_records
  for insert to authenticated with check (private.is_halaqa_staff(halaqa_id));
create policy progress_update on public.quran_progress_records
  for update to authenticated
  using (private.is_halaqa_staff(halaqa_id))
  with check (private.is_halaqa_staff(halaqa_id));
create policy progress_delete on public.quran_progress_records
  for delete to authenticated using (private.is_halaqa_staff(halaqa_id) and status = 'draft');

-- Amend an approved record with a mandatory reason (audited with diff).
create or replace function public.amend_progress_record(p_id uuid, p_patch jsonb, p_reason text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if char_length(btrim(coalesce(p_reason, ''))) < 5 then
    raise exception 'اكتب سببًا واضحًا للتعديل' using errcode = '22023';
  end if;
  perform set_config('halaqati.amend_reason', btrim(p_reason), true);
  update public.quran_progress_records set
    activity = coalesce((p_patch ->> 'activity')::public.quran_activity, activity),
    surah_from = coalesce((p_patch ->> 'surah_from')::smallint, surah_from),
    ayah_from = coalesce((p_patch ->> 'ayah_from')::smallint, ayah_from),
    surah_to = coalesce((p_patch ->> 'surah_to')::smallint, surah_to),
    ayah_to = coalesce((p_patch ->> 'ayah_to')::smallint, ayah_to),
    completion = coalesce((p_patch ->> 'completion')::public.completion_status, completion),
    mastery_score = case when p_patch ? 'mastery_score' then (p_patch ->> 'mastery_score')::smallint else mastery_score end,
    recitation_score = case when p_patch ? 'recitation_score' then (p_patch ->> 'recitation_score')::smallint else recitation_score end,
    plan_adherence = coalesce((p_patch ->> 'plan_adherence')::public.plan_adherence, plan_adherence),
    teacher_notes = case when p_patch ? 'teacher_notes' then p_patch ->> 'teacher_notes' else teacher_notes end
  where id = p_id;
  if not found then
    raise exception 'السجل غير موجود' using errcode = 'P0002';
  end if;
  perform set_config('halaqati.amend_reason', '', true);
end $$;

-- ---------------------------------------------------------------------
-- Recitation errors
-- ---------------------------------------------------------------------
create table public.quran_error_records (
  id uuid primary key default gen_random_uuid(),
  progress_record_id uuid not null references public.quran_progress_records (id) on delete cascade,
  halaqa_id uuid not null references public.halaqat (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  error_type public.recitation_error_type not null,
  surah smallint references public.quran_surahs (number),
  ayah smallint check (ayah is null or ayah >= 1),
  word text check (word is null or char_length(word) <= 100),
  note text check (note is null or char_length(note) <= 500),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index quran_errors_record_idx on public.quran_error_records (progress_record_id);
create index quran_errors_student_idx on public.quran_error_records (student_id, created_at desc);

create or replace function private.errors_guard()
returns trigger language plpgsql set search_path = '' as $$
declare v_rec public.quran_progress_records; v_reason text := nullif(current_setting('halaqati.amend_reason', true), '');
begin
  select * into v_rec from public.quran_progress_records
   where id = case when tg_op = 'DELETE' then old.progress_record_id else new.progress_record_id end;
  if v_rec.status = 'approved' and v_reason is null then
    raise exception 'تعديل أخطاء سجل معتمد يتطلب ذكر سبب التعديل' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if tg_op = 'UPDATE' then
    new.progress_record_id := old.progress_record_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  else
    new.created_by := coalesce(auth.uid(), new.created_by);
  end if;
  new.halaqa_id := v_rec.halaqa_id;
  new.student_id := v_rec.student_id;
  if new.surah is not null and new.ayah is not null
     and new.ayah > (select ayah_count from public.quran_surahs where number = new.surah) then
    raise exception 'رقم الآية خارج حدود السورة' using errcode = '22023';
  end if;
  return new;
end $$;
create trigger errors_guard before insert or update or delete on public.quran_error_records
  for each row execute function private.errors_guard();

create or replace function private.errors_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_reason text := nullif(current_setting('halaqati.amend_reason', true), '');
begin
  if v_reason is not null then
    perform private.audit('progress_error.' || lower(tg_op), 'quran_error_record',
      coalesce(new.id, old.id),
      jsonb_build_object('reason', v_reason, 'before', to_jsonb(old), 'after', to_jsonb(new)));
  end if;
  return coalesce(new, old);
end $$;
create trigger errors_audit after insert or update or delete on public.quran_error_records
  for each row execute function private.errors_audit();

alter table public.quran_error_records enable row level security;
create policy quran_errors_select on public.quran_error_records
  for select to authenticated
  using (
    private.is_halaqa_staff(halaqa_id)
    or ((student_id = (select auth.uid()) or private.is_parent_of(student_id))
        and exists (select 1 from public.quran_progress_records r
                    where r.id = progress_record_id and r.status = 'approved'))
  );
create policy quran_errors_insert on public.quran_error_records
  for insert to authenticated
  with check (private.is_halaqa_staff((select r.halaqa_id from public.quran_progress_records r where r.id = progress_record_id)));
create policy quran_errors_update on public.quran_error_records
  for update to authenticated
  using (private.is_halaqa_staff(halaqa_id)) with check (private.is_halaqa_staff(halaqa_id));
create policy quran_errors_delete on public.quran_error_records
  for delete to authenticated using (private.is_halaqa_staff(halaqa_id));

-- Record a recitation (record + errors) in one transaction. Runs as caller.
create or replace function public.record_recitation(p_record jsonb, p_errors jsonb default '[]'::jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_id uuid; v_err jsonb;
begin
  if jsonb_typeof(coalesce(p_errors, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_errors, '[]'::jsonb)) > 100 then
    raise exception 'قائمة الأخطاء غير صحيحة' using errcode = '22023';
  end if;
  -- Errors are inserted while the record is still a draft, then approved.
  insert into public.quran_progress_records (
    student_id, halaqa_id, session_id, assignment_id, activity,
    surah_from, ayah_from, surah_to, ayah_to, completion,
    mastery_score, recitation_score, plan_adherence, teacher_notes, recorded_on, status
  ) values (
    (p_record ->> 'student_id')::uuid,
    (p_record ->> 'halaqa_id')::uuid,
    nullif(p_record ->> 'session_id', '')::uuid,
    nullif(p_record ->> 'assignment_id', '')::uuid,
    (p_record ->> 'activity')::public.quran_activity,
    (p_record ->> 'surah_from')::smallint, (p_record ->> 'ayah_from')::smallint,
    (p_record ->> 'surah_to')::smallint, (p_record ->> 'ayah_to')::smallint,
    (p_record ->> 'completion')::public.completion_status,
    nullif(p_record ->> 'mastery_score', '')::smallint,
    nullif(p_record ->> 'recitation_score', '')::smallint,
    coalesce(nullif(p_record ->> 'plan_adherence', ''), 'no_plan')::public.plan_adherence,
    nullif(btrim(p_record ->> 'teacher_notes'), ''),
    coalesce(nullif(p_record ->> 'recorded_on', '')::date, current_date),
    'draft'
  ) returning id into v_id;

  for v_err in select * from jsonb_array_elements(coalesce(p_errors, '[]'::jsonb)) loop
    insert into public.quran_error_records (progress_record_id, halaqa_id, student_id, error_type, surah, ayah, word, note)
    values (v_id, (p_record ->> 'halaqa_id')::uuid, (p_record ->> 'student_id')::uuid,
            (v_err ->> 'error_type')::public.recitation_error_type,
            nullif(v_err ->> 'surah', '')::smallint, nullif(v_err ->> 'ayah', '')::smallint,
            nullif(btrim(v_err ->> 'word'), ''), nullif(btrim(v_err ->> 'note'), ''));
  end loop;

  if coalesce((p_record ->> 'approve')::boolean, true) then
    update public.quran_progress_records set status = 'approved' where id = v_id;
  end if;
  return v_id;
end $$;

-- Approve a draft record.
create or replace function public.approve_progress_record(p_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.quran_progress_records set status = 'approved' where id = p_id and status = 'draft';
  if not found then raise exception 'السجل غير موجود أو معتمد مسبقًا' using errcode = 'P0002'; end if;
end $$;

-- ---------------------------------------------------------------------
-- Student overview (amount, mastery, recitation, adherence, attendance
-- reported separately). Raises if the caller may not view the student.
-- ---------------------------------------------------------------------
create or replace function public.get_student_overview(p_student uuid, p_days integer default 30, p_halaqa uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_since date := current_date - greatest(least(p_days, 365), 1);
  v_self_or_parent boolean := auth.uid() = p_student or private.is_parent_of(p_student);
begin
  -- The student and linked parents see everything; halaqa staff only see
  -- the halaqa they serve (never totals from other teachers' halaqat).
  if not (v_self_or_parent
          or (p_halaqa is not null and private.is_halaqa_staff(p_halaqa)
              and exists (select 1 from public.halaqa_memberships m
                          where m.halaqa_id = p_halaqa and m.user_id = p_student and m.role = 'student'))) then
    raise exception 'لا تملك صلاحية عرض بيانات هذا الطالب' using errcode = '42501';
  end if;
  return (
    with r as (
      select * from public.quran_progress_records
      where student_id = p_student and status = 'approved'
        and (p_halaqa is null or halaqa_id = p_halaqa)
    ), rp as (
      select * from r where recorded_on >= v_since
    )
    select jsonb_build_object(
      'amount', jsonb_build_object(
        'new_memorization_ayat', coalesce((select sum(ayah_count) from r where activity = 'new_memorization' and completion = 'completed'), 0),
        'review_ayat_period', coalesce((select sum(ayah_count) from rp where activity <> 'new_memorization' and completion <> 'not_completed'), 0),
        'sessions_recorded_period', (select count(*) from rp)
      ),
      'mastery_avg', (select round(avg(mastery_score)::numeric, 2) from rp where mastery_score is not null),
      'recitation_avg', (select round(avg(recitation_score)::numeric, 2) from rp where recitation_score is not null),
      'plan_adherence', coalesce((select jsonb_object_agg(plan_adherence, n) from (
          select plan_adherence, count(*) n from rp group by plan_adherence) t), '{}'::jsonb),
      'attendance', coalesce((select jsonb_object_agg(status, n) from (
          select a.status, count(*) n from public.attendance_records a
          where a.student_id = p_student and a.created_at >= v_since
            and (p_halaqa is null or a.halaqa_id = p_halaqa)
          group by a.status) t), '{}'::jsonb),
      'errors_by_type', coalesce((select jsonb_object_agg(error_type, n) from (
          select e.error_type, count(*) n from public.quran_error_records e
          join rp on rp.id = e.progress_record_id
          group by e.error_type) t), '{}'::jsonb),
      'period_days', greatest(least(p_days, 365), 1)
    )
  );
end $$;

-- ---------------------------------------------------------------------
-- Public browse functions (safe columns only, no student identities)
-- ---------------------------------------------------------------------
create or replace function public.get_public_halaqat(
  p_search text default null,
  p_mode public.meeting_mode default null,
  p_level public.halaqa_level default null,
  p_gender public.audience_gender default null,
  p_limit integer default 12,
  p_offset integer default 0
) returns table (
  id uuid, name text, description text, teacher_id uuid, teacher_name text,
  center_id uuid, center_name text, is_independent boolean,
  audience_gender public.audience_gender, age_min smallint, age_max smallint,
  level public.halaqa_level, max_students smallint, active_students integer,
  meeting_mode public.meeting_mode, location_text text, schedule jsonb, timezone text,
  join_policy public.halaqa_join_policy, total_count bigint
) language sql stable security definer set search_path = '' as $$
  select h.id, h.name, h.description, h.teacher_id,
         coalesce(p.display_name, p.full_name),
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
  order by h.created_at desc
  limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0)
$$;

create or replace function public.get_public_halaqa(p_id uuid)
returns table (
  id uuid, name text, description text, teacher_id uuid, teacher_name text, teacher_bio text,
  center_id uuid, center_name text, is_independent boolean,
  audience_gender public.audience_gender, age_min smallint, age_max smallint,
  level public.halaqa_level, max_students smallint, active_students integer,
  meeting_mode public.meeting_mode, location_text text, schedule jsonb, timezone text,
  join_policy public.halaqa_join_policy
) language sql stable security definer set search_path = '' as $$
  select h.id, h.name, h.description, h.teacher_id,
         coalesce(p.display_name, p.full_name),
         case when p.directory_visible then p.bio end,
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

create or replace function public.get_public_teachers(p_search text default null, p_limit integer default 20, p_offset integer default 0)
returns table (id uuid, name text, bio text, avatar_url text, roles public.app_role[], published_halaqat bigint, total_count bigint)
language sql stable security definer set search_path = '' as $$
  select p.id, coalesce(p.display_name, p.full_name), p.bio, p.avatar_url,
         array(select r.role from public.user_roles r
               where r.user_id = p.id and r.revoked_at is null and r.role in ('quran_teacher', 'instructor')
               order by r.role),
         (select count(*) from public.halaqat h where h.teacher_id = p.id and h.status = 'published' and h.deleted_at is null),
         count(*) over ()
  from public.profiles p
  where p.directory_visible and p.deleted_at is null
    and exists (select 1 from public.user_roles r where r.user_id = p.id and r.revoked_at is null
                and r.role in ('quran_teacher', 'instructor'))
    and (p_search is null or p_search = '' or p.full_name ilike '%' || p_search || '%'
         or p.display_name ilike '%' || p_search || '%')
  order by p.created_at
  limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0)
$$;

-- ---------------------------------------------------------------------
-- Table privileges: Supabase default privileges grant new tables to anon;
-- anonymous access goes through get_public_* functions only.
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon;
grant select on public.quran_surahs to anon;

-- ---------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------
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
  public.request_join_halaqa(uuid, text),
  public.decide_join_request(uuid, boolean, text),
  public.leave_halaqa(uuid),
  public.remove_halaqa_member(uuid, text),
  public.save_attendance(uuid, jsonb),
  public.amend_progress_record(uuid, jsonb, text),
  public.record_recitation(jsonb, jsonb),
  public.approve_progress_record(uuid),
  public.get_student_overview(uuid, integer, uuid)
to authenticated;
grant execute on function
  public.get_public_halaqat(text, public.meeting_mode, public.halaqa_level, public.audience_gender, integer, integer),
  public.get_public_halaqa(uuid),
  public.get_public_teachers(text, integer, integer),
  public.get_public_centers(text, integer, integer)
to anon, authenticated;
