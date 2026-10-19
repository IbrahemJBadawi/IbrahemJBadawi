-- =====================================================================
-- TechMood Growth — Migration 0400: Appointments
-- Availability per organization (in the organization's time zone),
-- public booking links, and double-booking prevention enforced in the
-- database: a trigger locks the organization row, then rejects any
-- overlap with SQLSTATE 23P01. Concurrent bookings are serialised by the
-- lock, so they cannot both succeed. (A btree_gist exclusion constraint
-- would also work on Supabase, but the embedded local database does not
-- ship that extension, and one code path for both is simpler to trust.)
--
-- One shared calendar per organization in this version. Per-staff
-- calendars are a later step (see docs/STATUS.md).
-- =====================================================================

create type public.appointment_status as enum ('booked', 'confirmed', 'completed', 'canceled', 'no_show');
create type public.email_status as enum ('sent', 'failed', 'not_configured', 'skipped');

create table public.appointment_settings (
  org_id uuid primary key references public.organizations (id) on delete cascade,
  enabled boolean not null default false,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,60}$'),
  title text not null default 'استشارة تعريفية' check (char_length(btrim(title)) between 2 and 120),
  description text check (description is null or char_length(description) <= 1000),
  location text check (location is null or char_length(location) <= 300),
  duration_minutes integer not null default 30 check (duration_minutes between 10 and 240),
  buffer_minutes integer not null default 0 check (buffer_minutes between 0 and 120),
  slot_step_minutes integer not null default 30 check (slot_step_minutes between 5 and 240),
  min_notice_minutes integer not null default 120 check (min_notice_minutes between 0 and 20160),
  max_days_ahead integer not null default 30 check (max_days_ahead between 1 and 120),
  -- {"0": [["09:00","17:00"]], ...} keyed by day of week (0 = Sunday),
  -- local times in the organization's time zone.
  weekly_hours jsonb not null default
    '{"0":[["09:00","17:00"]],"1":[["09:00","17:00"]],"2":[["09:00","17:00"]],"3":[["09:00","17:00"]],"4":[["09:00","17:00"]]}'::jsonb,
  updated_at timestamptz not null default now()
);
create trigger appointment_settings_updated_at before update on public.appointment_settings
  for each row execute function private.set_updated_at();

create or replace function private.validate_weekly_hours()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_day text;
  v_win jsonb;
begin
  if jsonb_typeof(new.weekly_hours) <> 'object' then
    raise exception 'أوقات العمل غير صالحة' using errcode = '22023';
  end if;
  for v_day in select jsonb_object_keys(new.weekly_hours) loop
    if v_day !~ '^[0-6]$' or jsonb_typeof(new.weekly_hours -> v_day) <> 'array' then
      raise exception 'أوقات العمل غير صالحة' using errcode = '22023';
    end if;
    for v_win in select jsonb_array_elements(new.weekly_hours -> v_day) loop
      if jsonb_typeof(v_win) <> 'array' or jsonb_array_length(v_win) <> 2
         or (v_win ->> 0) !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or (v_win ->> 1) !~ '^(([01][0-9]|2[0-3]):[0-5][0-9]|24:00)$'
         or (v_win ->> 0) >= (v_win ->> 1) then
        raise exception 'فترة عمل غير صالحة: يجب أن يسبق وقت البداية وقت النهاية' using errcode = '22023';
      end if;
    end loop;
  end loop;
  return new;
end $$;
create trigger appointment_settings_hours before insert or update of weekly_hours on public.appointment_settings
  for each row execute function private.validate_weekly_hours();

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  lead_id uuid,
  title text not null check (char_length(btrim(title)) between 2 and 160),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  -- ends_at + the buffer at booking time: the span the slot blocks.
  blocked_until timestamptz not null,
  status public.appointment_status not null default 'booked',
  notes text check (notes is null or char_length(notes) <= 2000),
  location text check (location is null or char_length(location) <= 300),
  assigned_to uuid references public.profiles (id) on delete set null,
  source text not null default 'staff' check (source in ('staff', 'public')),
  manage_token_hash text unique,
  confirmation_email public.email_status,
  reminder_email public.email_status,
  reminder_sent_at timestamptz,
  canceled_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id),
  check (ends_at > starts_at and ends_at <= starts_at + interval '8 hours'),
  check (blocked_until >= ends_at),
  foreign key (org_id, lead_id) references public.leads (org_id, id) on delete set null (lead_id)
);
create index appointments_org_start_idx on public.appointments (org_id, starts_at);
create index appointments_lead_idx on public.appointments (lead_id);
create index appointments_reminder_idx on public.appointments (starts_at)
  where status in ('booked', 'confirmed') and reminder_sent_at is null;
create trigger appointments_updated_at before update on public.appointments
  for each row execute function private.set_updated_at();
create trigger appointments_org before update on public.appointments
  for each row execute function private.prevent_org_change();

create table public.email_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  appointment_id uuid references public.appointments (id) on delete cascade,
  kind text not null check (kind in ('confirmation', 'reminder', 'cancellation', 'invitation')),
  status public.email_status not null,
  error text check (error is null or char_length(error) <= 300),
  created_at timestamptz not null default now()
);
create index email_logs_org_idx on public.email_logs (org_id, created_at desc);

-- ---------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------
create or replace function private.appointment_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_buffer integer;
begin
  if new.assigned_to is not null and not private.is_member(new.org_id, new.assigned_to) then
    raise exception 'المسؤول المحدد ليس عضوًا في الشركة' using errcode = '22023';
  end if;
  if tg_op = 'INSERT' or new.starts_at <> old.starts_at or new.ends_at <> old.ends_at then
    select buffer_minutes into v_buffer from public.appointment_settings where org_id = new.org_id;
    new.blocked_until := new.ends_at + make_interval(mins => coalesce(v_buffer, 0));
  end if;
  if tg_op = 'UPDATE' then
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.source := old.source;
    new.manage_token_hash := old.manage_token_hash;
    if new.status = 'canceled' and old.status <> 'canceled' then new.canceled_at := now(); end if;
    -- A moved appointment needs a fresh reminder.
    if new.starts_at <> old.starts_at then new.reminder_sent_at := null; new.reminder_email := null; end if;
  end if;
  -- The double-booking guarantee: active appointments of one organization
  -- never overlap, whichever path (staff, public, concurrent) wrote them.
  if new.status in ('booked', 'confirmed') then
    perform 1 from public.organizations where id = new.org_id for update;
    if exists (
      select 1 from public.appointments a
      where a.org_id = new.org_id and a.id <> new.id and a.status in ('booked', 'confirmed')
        and tstzrange(a.starts_at, a.blocked_until, '[)') && tstzrange(new.starts_at, new.blocked_until, '[)')
    ) then
      raise exception 'يتعارض هذا الموعد مع موعد آخر محجوز' using errcode = '23P01', hint = 'slot_taken';
    end if;
  end if;
  return new;
end $$;
create trigger appointments_before_write before insert or update on public.appointments
  for each row execute function private.appointment_before_write();

-- Logs the appointment on the lead and moves an early-stage lead to the
-- first "booked" stage.
create or replace function private.appointment_after_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_booked uuid;
begin
  if new.lead_id is null then return new; end if;
  if tg_op = 'INSERT' then
    insert into public.lead_activities (org_id, lead_id, kind, meta, created_by)
    values (new.org_id, new.lead_id, 'appointment',
            jsonb_build_object('appointment_id', new.id, 'event', 'booked', 'starts_at', new.starts_at, 'source', new.source), auth.uid());
    v_booked := private.first_stage(new.org_id, 'booked');
    if v_booked is not null then
      update public.leads l set stage_id = v_booked
      where l.id = new.lead_id
        and (select category from public.pipeline_stages where id = l.stage_id) in ('new', 'working', 'qualified');
    end if;
  elsif new.status is distinct from old.status or new.starts_at <> old.starts_at then
    insert into public.lead_activities (org_id, lead_id, kind, meta, created_by)
    values (new.org_id, new.lead_id, 'appointment',
            jsonb_build_object('appointment_id', new.id, 'event', case when new.status is distinct from old.status then new.status::text else 'rescheduled' end,
                               'starts_at', new.starts_at), auth.uid());
  end if;
  return new;
end $$;
create trigger appointments_after_write after insert or update on public.appointments
  for each row execute function private.appointment_after_write();

-- ---------------------------------------------------------------------
-- Slot computation (shared by the dashboard and the public page)
-- ---------------------------------------------------------------------
create or replace function private.available_slots(p_org uuid, p_from date, p_days integer, p_ignore uuid default null)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with s as (
    select a.*, o.timezone as tz from public.appointment_settings a
    join public.organizations o on o.id = a.org_id
    where a.org_id = p_org
  ),
  days as (
    select d::date as day from s, generate_series(p_from::timestamp, (p_from + (least(greatest(p_days, 1), 31) - 1))::timestamp, interval '1 day') d
  ),
  windows as (
    select days.day, (w ->> 0)::time as w_start, (w ->> 1)::time as w_end
    from days, s, jsonb_array_elements(coalesce(s.weekly_hours -> extract(dow from days.day)::int::text, '[]'::jsonb)) w
  ),
  candidates as (
    select gs as slot_start
    from windows, s,
      generate_series(
        (windows.day + windows.w_start) at time zone s.tz,
        (windows.day + windows.w_end) at time zone s.tz
          - make_interval(mins => s.duration_minutes),
        make_interval(mins => s.slot_step_minutes)
      ) gs
  )
  select c.slot_start, c.slot_start + make_interval(mins => s.duration_minutes)
  from candidates c, s
  where c.slot_start >= now() + make_interval(mins => s.min_notice_minutes)
    and c.slot_start <= now() + make_interval(days => s.max_days_ahead)
    and not exists (
      select 1 from public.appointments ap
      where ap.org_id = p_org and ap.status in ('booked', 'confirmed')
        and (p_ignore is null or ap.id <> p_ignore)
        and tstzrange(ap.starts_at, ap.blocked_until, '[)')
            && tstzrange(c.slot_start, c.slot_start + make_interval(mins => s.duration_minutes + s.buffer_minutes), '[)')
    )
  order by 1
$$;

create or replace function private.new_token()
returns text language sql volatile set search_path = '' as $$
  select replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
$$;

create or replace function private.hash_token(p_token text)
returns text language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
$$;

-- ---------------------------------------------------------------------
-- Public booking (anon)
-- ---------------------------------------------------------------------
create or replace function public.get_public_booking(p_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'slug', a.slug, 'title', a.title, 'description', a.description, 'location', a.location,
    'duration_minutes', a.duration_minutes, 'max_days_ahead', a.max_days_ahead,
    'timezone', o.timezone, 'org_name', o.name
  )
  from public.appointment_settings a
  join public.organizations o on o.id = a.org_id
  where a.slug = p_slug and a.enabled and (private.effective_plan(a.org_id)).public_booking
$$;

-- Free slots only: never who booked or why.
create or replace function public.get_public_slots(p_slug text, p_from date, p_days integer default 7)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.starts_at, s.ends_at
  from public.appointment_settings a, private.available_slots(a.org_id, p_from, least(greatest(p_days, 1), 14)) s
  where a.slug = p_slug and a.enabled and (private.effective_plan(a.org_id)).public_booking
$$;

create or replace function public.book_public_appointment(
  p_slug text,
  p_starts_at timestamptz,
  p_name text,
  p_email text,
  p_phone text,
  p_notes text,
  p_consent boolean,
  p_client_key text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_set public.appointment_settings;
  v_org public.organizations;
  v_end timestamptz;
  v_lead uuid;
  v_appt uuid;
  v_token text := private.new_token();
  v_name text := private.clean_text(p_name, 120);
  v_email text := lower(private.clean_text(p_email, 254));
  v_phone text := private.clean_text(p_phone, 32);
begin
  select * into v_set from public.appointment_settings where slug = p_slug and enabled;
  if v_set.org_id is null or not (private.effective_plan(v_set.org_id)).public_booking then
    raise exception 'الحجز غير متاح حاليًا' using errcode = 'P0002';
  end if;
  select * into v_org from public.organizations where id = v_set.org_id;
  if not coalesce(p_consent, false) then
    raise exception 'يجب الموافقة على استخدام بياناتك لإتمام الحجز' using errcode = '22023';
  end if;
  if p_client_key is not null and not private.consume_rate_limit('book:' || v_set.org_id || ':' || left(p_client_key, 64), 3, 3600) then
    raise exception 'أجريت عدة حجوزات خلال وقت قصير. حاول لاحقًا.' using errcode = 'P0001', hint = 'rate_limit';
  end if;
  if not private.consume_rate_limit('book:' || v_set.org_id, 40, 3600) then
    raise exception 'الحجز مزدحم الآن. حاول بعد قليل.' using errcode = 'P0001', hint = 'rate_limit';
  end if;
  if v_name is null or char_length(v_name) < 2 then
    raise exception 'اكتب الاسم (حرفان على الأقل)' using errcode = '22023';
  end if;
  if v_email is null or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then
    raise exception 'أدخل بريدًا إلكترونيًا صحيحًا لنرسل لك التأكيد' using errcode = '22023';
  end if;
  if v_phone is not null and (v_phone !~ '^\+?[0-9 ()-]{7,20}$' or char_length(regexp_replace(v_phone, '[^0-9]', '', 'g')) not between 7 and 15) then
    raise exception 'رقم الهاتف غير صحيح' using errcode = '22023';
  end if;
  -- The time must be one of the published free slots.
  select s.ends_at into v_end
  from private.available_slots(v_set.org_id, (p_starts_at at time zone v_org.timezone)::date, 1) s
  where s.starts_at = p_starts_at;
  if v_end is null then
    raise exception 'هذا الموعد لم يعد متاحًا. اختر وقتًا آخر.' using errcode = 'P0001', hint = 'slot_taken';
  end if;

  insert into public.leads (org_id, full_name, email, phone, needs, source, consent_at)
  values (v_set.org_id, v_name, v_email, v_phone, private.clean_text(p_notes, 2000), 'booking', now())
  returning id into v_lead;

  begin
    insert into public.appointments (org_id, lead_id, title, starts_at, ends_at, notes, location, source, manage_token_hash)
    values (v_set.org_id, v_lead, v_set.title, p_starts_at, v_end, private.clean_text(p_notes, 2000), v_set.location, 'public', private.hash_token(v_token))
    returning id into v_appt;
  exception when exclusion_violation then
    raise exception 'هذا الموعد لم يعد متاحًا. اختر وقتًا آخر.' using errcode = 'P0001', hint = 'slot_taken';
  end;

  return jsonb_build_object(
    'appointment_id', v_appt, 'manage_token', v_token, 'starts_at', p_starts_at, 'ends_at', v_end,
    'title', v_set.title, 'location', v_set.location, 'org_name', v_org.name, 'timezone', v_org.timezone, 'email', v_email
  );
end $$;

create or replace function public.get_public_appointment(p_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'title', a.title, 'starts_at', a.starts_at, 'ends_at', a.ends_at, 'status', a.status,
    'location', a.location, 'org_name', o.name, 'timezone', o.timezone, 'booking_slug', s.slug
  )
  from public.appointments a
  join public.organizations o on o.id = a.org_id
  left join public.appointment_settings s on s.org_id = a.org_id
  where a.manage_token_hash = private.hash_token(p_token)
$$;

create or replace function public.cancel_public_appointment(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  update public.appointments set status = 'canceled'
  where manage_token_hash = private.hash_token(p_token) and status in ('booked', 'confirmed') and starts_at > now()
  returning id into v_id;
  if v_id is null then
    raise exception 'لا يمكن إلغاء هذا الموعد (قد يكون ملغى أو انقضى وقته)' using errcode = 'P0001';
  end if;
  return jsonb_build_object('ok', true, 'appointment_id', v_id);
end $$;

create or replace function public.reschedule_public_appointment(p_token text, p_starts_at timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_appt public.appointments;
  v_tz text;
  v_end timestamptz;
begin
  select * into v_appt from public.appointments
  where manage_token_hash = private.hash_token(p_token) and status in ('booked', 'confirmed') and starts_at > now()
  for update;
  if v_appt.id is null then
    raise exception 'لا يمكن تعديل هذا الموعد' using errcode = 'P0001';
  end if;
  select timezone into v_tz from public.organizations where id = v_appt.org_id;
  select s.ends_at into v_end
  from private.available_slots(v_appt.org_id, (p_starts_at at time zone v_tz)::date, 1, v_appt.id) s
  where s.starts_at = p_starts_at;
  if v_end is null then
    raise exception 'هذا الموعد لم يعد متاحًا. اختر وقتًا آخر.' using errcode = 'P0001', hint = 'slot_taken';
  end if;
  begin
    update public.appointments set starts_at = p_starts_at, ends_at = v_end, status = 'booked' where id = v_appt.id;
  exception when exclusion_violation then
    raise exception 'هذا الموعد لم يعد متاحًا. اختر وقتًا آخر.' using errcode = 'P0001', hint = 'slot_taken';
  end;
  return jsonb_build_object('ok', true, 'starts_at', p_starts_at, 'ends_at', v_end);
end $$;

-- Staff: free slots of their own organization.
create or replace function public.get_org_slots(p_org uuid, p_from date, p_days integer default 7)
returns table (starts_at timestamptz, ends_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_member(p_org) then
    raise exception 'لا تملك صلاحية' using errcode = '42501';
  end if;
  return query select * from private.available_slots(p_org, p_from, p_days);
end $$;

-- Email outcome. Staff of the organization, or whoever holds the
-- appointment's manage token (the public booking flow), may record it.
create or replace function public.log_appointment_email(p_appointment uuid, p_token text, p_kind text, p_status public.email_status, p_error text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_appt public.appointments;
begin
  select * into v_appt from public.appointments where id = p_appointment;
  if v_appt.id is null or not (
       private.can_write(v_appt.org_id)
       or (p_token is not null and v_appt.manage_token_hash = private.hash_token(p_token))) then
    raise exception 'لا تملك صلاحية' using errcode = '42501';
  end if;
  if p_kind not in ('confirmation', 'reminder', 'cancellation') then
    raise exception 'نوع غير معروف' using errcode = '22023';
  end if;
  insert into public.email_logs (org_id, appointment_id, kind, status, error)
  values (v_appt.org_id, v_appt.id, p_kind, p_status, left(p_error, 300));
  if p_kind = 'confirmation' then
    update public.appointments set confirmation_email = p_status where id = v_appt.id;
  elsif p_kind = 'reminder' then
    update public.appointments set reminder_email = p_status,
      reminder_sent_at = case when p_status = 'sent' then now() else reminder_sent_at end
    where id = v_appt.id;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.appointment_settings enable row level security;
alter table public.appointments enable row level security;
alter table public.email_logs enable row level security;

create policy appointment_settings_select on public.appointment_settings for select to authenticated using (private.is_member(org_id));
create policy appointment_settings_update on public.appointment_settings for update to authenticated
  using (private.is_org_admin(org_id)) with check (private.is_org_admin(org_id));

create policy appointments_select on public.appointments for select to authenticated using (private.is_member(org_id));
create policy appointments_insert on public.appointments for insert to authenticated
  with check (private.can_write(org_id) and created_by = auth.uid() and source = 'staff' and manage_token_hash is null);
create policy appointments_update on public.appointments for update to authenticated
  using (private.can_write(org_id)) with check (private.can_write(org_id));
create policy appointments_delete on public.appointments for delete to authenticated using (private.is_org_admin(org_id));

create policy email_logs_select on public.email_logs for select to authenticated using (private.is_member(org_id));

revoke all on public.appointment_settings, public.appointments, public.email_logs from anon;
revoke insert, delete on public.appointment_settings from authenticated;
revoke insert, update, delete on public.email_logs from authenticated;
-- Server-only columns.
revoke update on public.appointments from authenticated;
grant update (lead_id, title, starts_at, ends_at, status, notes, location, assigned_to) on public.appointments to authenticated;
