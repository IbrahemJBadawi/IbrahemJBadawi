-- =====================================================================
-- Halaqati — Migration 0100: Foundation
-- Accounts, profiles, multi-role system, institutions (organizations and
-- centers) with tenant isolation, parent ↔ student links, notifications,
-- audit log, privacy requests and rate limiting.
--
-- Conventions
--  * Every table in `public` has RLS enabled. Writes that need several
--    checks or must be audited go through SECURITY DEFINER RPCs.
--  * Authorization helpers live in schema `private`, which PostgREST does
--    not expose.
--  * All functions pin `search_path = ''` and use schema-qualified names.
-- =====================================================================

create schema if not exists private;
grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.app_role as enum (
  'student', 'parent', 'quran_teacher', 'instructor', 'sponsor', 'platform_admin'
);
create type public.org_member_role as enum ('owner', 'admin', 'staff');
create type public.center_member_role as enum ('admin', 'teacher', 'student');
create type public.membership_status as enum ('pending', 'active', 'rejected', 'removed', 'left');
create type public.institution_status as enum ('pending', 'verified', 'suspended');
create type public.parent_link_status as enum ('active', 'revoked');
create type public.parent_relationship as enum ('father', 'mother', 'guardian', 'other');
create type public.privacy_request_kind as enum ('export', 'delete');
create type public.privacy_request_status as enum ('pending', 'processing', 'completed', 'rejected');

-- ---------------------------------------------------------------------
-- Generic trigger: updated_at
-- ---------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Profiles (identity visible to people the user deals with)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  display_name text check (display_name is null or char_length(btrim(display_name)) between 2 and 60),
  bio text check (bio is null or char_length(bio) <= 1000),
  avatar_url text check (avatar_url is null or avatar_url ~ '^https://'),
  -- Opt-in listing in the public teachers directory.
  directory_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- Sensitive personal details kept apart from the identity row so the
-- profiles table can be shared more widely than these fields.
create table public.profile_details (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  gender text check (gender in ('male', 'female')),
  birth_year smallint check (birth_year between 1900 and 2100),
  country text check (country is null or char_length(country) <= 60),
  city text check (city is null or char_length(city) <= 60),
  updated_at timestamptz not null default now()
);
create trigger profile_details_updated_at before update on public.profile_details
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- Roles (global capabilities). Scoped admin roles (center/org admin)
-- come from memberships below, never from this table.
-- ---------------------------------------------------------------------
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles (id) on delete set null
);
create unique index user_roles_active_unique on public.user_roles (user_id, role) where revoked_at is null;
create index user_roles_role_idx on public.user_roles (role) where revoked_at is null;

-- ---------------------------------------------------------------------
-- Institutions
-- ---------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 3 and 150),
  description text check (description is null or char_length(description) <= 3000),
  country text check (country is null or char_length(country) <= 60),
  city text check (city is null or char_length(city) <= 60),
  contact_email text check (contact_email is null or contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  status public.institution_status not null default 'pending',
  verified_at timestamptz,
  verified_by uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index organizations_status_idx on public.organizations (status) where deleted_at is null;
create trigger organizations_updated_at before update on public.organizations
  for each row execute function private.set_updated_at();

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.org_member_role not null,
  status public.membership_status not null default 'active',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index organization_memberships_user_idx on public.organization_memberships (user_id) where status = 'active';
create trigger organization_memberships_updated_at before update on public.organization_memberships
  for each row execute function private.set_updated_at();

-- A center belongs to an organization or is an independent, verified center.
create table public.centers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 3 and 150),
  description text check (description is null or char_length(description) <= 3000),
  country text check (country is null or char_length(country) <= 60),
  city text check (city is null or char_length(city) <= 60),
  status public.institution_status not null default 'pending',
  verified_at timestamptz,
  verified_by uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index centers_org_idx on public.centers (organization_id) where deleted_at is null;
create index centers_status_idx on public.centers (status) where deleted_at is null;
create trigger centers_updated_at before update on public.centers
  for each row execute function private.set_updated_at();

create table public.center_memberships (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.center_member_role not null,
  status public.membership_status not null default 'active',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (center_id, user_id, role)
);
create index center_memberships_user_idx on public.center_memberships (user_id) where status = 'active';
create trigger center_memberships_updated_at before update on public.center_memberships
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- Parent ↔ student
-- ---------------------------------------------------------------------
create table public.parent_student_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  relationship public.parent_relationship not null,
  status public.parent_link_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles (id) on delete set null,
  check (parent_id <> student_id)
);
create unique index parent_student_links_active_unique
  on public.parent_student_links (parent_id, student_id) where status = 'active';
create index parent_student_links_student_idx on public.parent_student_links (student_id) where status = 'active';
create trigger parent_student_links_updated_at before update on public.parent_student_links
  for each row execute function private.set_updated_at();

-- One-time codes a student generates and hands to a parent. Only a hash
-- is stored; the plain code is shown once to the student.
create table public.parent_link_codes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  code_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index parent_link_codes_student_idx on public.parent_link_codes (student_id);

-- ---------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (char_length(kind) <= 60),
  title text not null check (char_length(title) <= 200),
  body text check (body is null or char_length(body) <= 1000),
  link_path text check (link_path is null or link_path ~ '^/[^/]'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- ---------------------------------------------------------------------
-- Audit log (append-only)
-- ---------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null check (char_length(action) <= 100),
  entity_type text not null check (char_length(entity_type) <= 60),
  entity_id uuid,
  organization_id uuid references public.organizations (id) on delete set null,
  center_id uuid references public.centers (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

-- ---------------------------------------------------------------------
-- Privacy requests (data export / account deletion)
-- ---------------------------------------------------------------------
create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.privacy_request_kind not null,
  status public.privacy_request_status not null default 'pending',
  reason text check (reason is null or char_length(reason) <= 1000),
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 1000),
  processed_at timestamptz,
  processed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index privacy_requests_open_unique
  on public.privacy_requests (user_id, kind) where status in ('pending', 'processing');
create trigger privacy_requests_updated_at before update on public.privacy_requests
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- Rate limiting (fixed window, stored in Postgres so it works serverless)
-- ---------------------------------------------------------------------
create table private.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

-- Returns true when the call is allowed, false once the limit is reached.
create or replace function private.consume_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into private.rate_limits as r (key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning hits into v_hits;
  -- Opportunistic cleanup of stale windows.
  if random() < 0.01 then
    delete from private.rate_limits where window_start < now() - interval '2 days';
  end if;
  return v_hits <= p_max;
end $$;

-- Exposed to the server (service role) only, for login/registration limits.
create or replace function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean language sql security definer set search_path = '' as $$
  select private.consume_rate_limit(p_key, p_max, p_window_seconds)
$$;

-- ---------------------------------------------------------------------
-- Authorization helpers
-- ---------------------------------------------------------------------
create or replace function private.has_role(p_role public.app_role, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles
    where user_id = p_user and role = p_role and revoked_at is null
  )
$$;

create or replace function private.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_role('platform_admin', auth.uid())
$$;

create or replace function private.is_org_admin(p_org uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select p_org is not null and exists (
    select 1 from public.organization_memberships m
    join public.organizations o on o.id = m.organization_id and o.deleted_at is null
    where m.organization_id = p_org and m.user_id = p_user
      and m.status = 'active' and m.role in ('owner', 'admin')
  )
$$;

create or replace function private.is_org_member(p_org uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select p_org is not null and exists (
    select 1 from public.organization_memberships m
    where m.organization_id = p_org and m.user_id = p_user and m.status = 'active'
  )
$$;

-- Center admin directly, or admin of the organization that owns the center.
create or replace function private.is_center_admin(p_center uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select p_center is not null and exists (
    select 1 from public.centers c
    where c.id = p_center and c.deleted_at is null
      and (
        exists (
          select 1 from public.center_memberships m
          where m.center_id = c.id and m.user_id = p_user
            and m.role = 'admin' and m.status = 'active'
        )
        or private.is_org_admin(c.organization_id, p_user)
      )
  )
$$;

create or replace function private.has_center_role(p_center uuid, p_role public.center_member_role, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select p_center is not null and exists (
    select 1 from public.center_memberships m
    where m.center_id = p_center and m.user_id = p_user
      and m.role = p_role and m.status = 'active'
  )
$$;

create or replace function private.is_center_member(p_center uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select p_center is not null and exists (
    select 1 from public.center_memberships m
    where m.center_id = p_center and m.user_id = p_user and m.status = 'active'
  )
$$;

create or replace function private.is_parent_of(p_student uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.parent_student_links l
    where l.parent_id = p_user and l.student_id = p_student and l.status = 'active'
  )
$$;

-- ---------------------------------------------------------------------
-- Audit + notification writers (definer; not callable by clients)
-- ---------------------------------------------------------------------
create or replace function private.audit(
  p_action text, p_entity_type text, p_entity_id uuid,
  p_metadata jsonb default '{}'::jsonb,
  p_organization uuid default null, p_center uuid default null
) returns void language sql security definer set search_path = '' as $$
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, organization_id, center_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_organization, p_center, coalesce(p_metadata, '{}'::jsonb));
$$;

create or replace function private.notify(
  p_user uuid, p_kind text, p_title text, p_body text default null, p_link text default null
) returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, title, body, link_path)
  values (p_user, p_kind, p_title, p_body, p_link);
$$;

-- ---------------------------------------------------------------------
-- New account bootstrap: profile + self-selected roles from signup
-- metadata. Only self-assignable roles are honoured, so a crafted signup
-- request can never grant platform_admin.
-- ---------------------------------------------------------------------
create or replace function private.self_assignable_roles()
returns public.app_role[] language sql immutable set search_path = '' as $$
  select array['student', 'parent', 'quran_teacher', 'instructor', 'sponsor']::public.app_role[]
$$;

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_name text;
  v_roles public.app_role[];
begin
  v_name := btrim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  if char_length(v_name) < 2 then
    v_name := coalesce(nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'مستخدم');
    if char_length(v_name) < 2 then v_name := v_name || '_'; end if;
  end if;
  v_name := left(v_name, 120);

  insert into public.profiles (id, full_name) values (new.id, v_name);
  insert into public.profile_details (user_id) values (new.id);

  select coalesce(array_agg(distinct x.value::public.app_role), '{}')
    into v_roles
  from jsonb_array_elements_text(
         case when jsonb_typeof(new.raw_user_meta_data -> 'roles') = 'array'
              then new.raw_user_meta_data -> 'roles' else '[]'::jsonb end
       ) as x(value)
  where x.value in (select unnest(private.self_assignable_roles())::text);

  if coalesce(array_length(v_roles, 1), 0) = 0 then
    v_roles := array['student']::public.app_role[];
  end if;

  insert into public.user_roles (user_id, role)
  select new.id, unnest(v_roles);

  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------
-- Guard: institution verification fields are platform-admin only.
-- ---------------------------------------------------------------------
create or replace function private.guard_institution_status()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.status is distinct from old.status
      or new.verified_at is distinct from old.verified_at
      or new.verified_by is distinct from old.verified_by
      or new.created_by is distinct from old.created_by)
     and coalesce(auth.role(), '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin')
     and not private.is_platform_admin() then
    raise exception 'لا يمكن تغيير حالة التوثيق إلا من إدارة المنصة' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger organizations_guard_status before update on public.organizations
  for each row execute function private.guard_institution_status();
create trigger centers_guard_status before update on public.centers
  for each row execute function private.guard_institution_status();

-- Organization link of a center can only change through admin RPCs.
create or replace function private.guard_center_org()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.organization_id is distinct from old.organization_id
     and current_user not in ('postgres', 'supabase_admin')
     and not private.is_platform_admin() then
    raise exception 'لا يمكن نقل المركز إلى مؤسسة أخرى' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger centers_guard_org before update on public.centers
  for each row execute function private.guard_center_org();

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.profile_details enable row level security;
alter table public.user_roles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.centers enable row level security;
alter table public.center_memberships enable row level security;
alter table public.parent_student_links enable row level security;
alter table public.parent_link_codes enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.privacy_requests enable row level security;
alter table private.rate_limits enable row level security;

-- Anonymous visitors never read tables directly; public pages use the
-- narrow get_public_* functions instead.
revoke all on all tables in schema public from anon;

-- profiles --------------------------------------------------------------
-- Visibility is widened in the halaqat migration (teachers ↔ students);
-- here: self, linked parents/children, fellow institution admins.
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_select_family on public.profiles
  for select to authenticated
  using (private.is_parent_of(id) or private.is_parent_of((select auth.uid()), id));

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke insert, delete on public.profiles from authenticated;
revoke update on public.profiles from authenticated;
grant update (full_name, display_name, bio, avatar_url, directory_visible) on public.profiles to authenticated;

-- profile_details ---------------------------------------------------------
create policy profile_details_select_self on public.profile_details
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_parent_of(user_id));

create policy profile_details_update_self on public.profile_details
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke insert, delete on public.profile_details from authenticated;
revoke update on public.profile_details from authenticated;
grant update (gender, birth_year, country, city) on public.profile_details to authenticated;

-- user_roles --------------------------------------------------------------
create policy user_roles_select on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_platform_admin());
revoke insert, update, delete on public.user_roles from authenticated;

-- organizations -----------------------------------------------------------
create policy organizations_select on public.organizations
  for select to authenticated
  using (
    (status = 'verified' and deleted_at is null)
    or private.is_org_member(id)
    or private.is_platform_admin()
  );
create policy organizations_update_admin on public.organizations
  for update to authenticated
  using (private.is_org_admin(id) or private.is_platform_admin())
  with check (private.is_org_admin(id) or private.is_platform_admin());
revoke insert, delete on public.organizations from authenticated;

-- organization_memberships -------------------------------------------------
create policy org_memberships_select on public.organization_memberships
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_org_admin(organization_id)
    or private.is_platform_admin()
  );
revoke insert, update, delete on public.organization_memberships from authenticated;

-- centers -----------------------------------------------------------------
create policy centers_select on public.centers
  for select to authenticated
  using (
    (status = 'verified' and deleted_at is null)
    or private.is_center_member(id)
    or private.is_center_admin(id)
    or private.is_platform_admin()
  );
create policy centers_update_admin on public.centers
  for update to authenticated
  using (private.is_center_admin(id) or private.is_platform_admin())
  with check (private.is_center_admin(id) or private.is_platform_admin());
revoke insert, delete on public.centers from authenticated;

-- center_memberships -------------------------------------------------------
create policy center_memberships_select on public.center_memberships
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_center_admin(center_id)
    or private.is_platform_admin()
  );
revoke insert, update, delete on public.center_memberships from authenticated;

-- parent links -------------------------------------------------------------
create policy parent_links_select on public.parent_student_links
  for select to authenticated
  using (parent_id = (select auth.uid()) or student_id = (select auth.uid()));
revoke insert, update, delete on public.parent_student_links from authenticated;

create policy parent_link_codes_select on public.parent_link_codes
  for select to authenticated
  using (student_id = (select auth.uid()));
revoke all on public.parent_link_codes from authenticated;
grant select (id, student_id, expires_at, used_at, created_at) on public.parent_link_codes to authenticated;

-- notifications ------------------------------------------------------------
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy notifications_delete_own on public.notifications
  for delete to authenticated
  using (user_id = (select auth.uid()));
revoke insert on public.notifications from authenticated;
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- audit_logs (read: platform admin; nobody writes directly) ---------------
create policy audit_logs_select_admin on public.audit_logs
  for select to authenticated
  using (private.is_platform_admin());
revoke insert, update, delete, truncate on public.audit_logs from authenticated, service_role;

-- privacy_requests ---------------------------------------------------------
create policy privacy_requests_select on public.privacy_requests
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_platform_admin());
revoke insert, update, delete on public.privacy_requests from authenticated;

-- =====================================================================
-- RPCs
-- =====================================================================

-- Roles -------------------------------------------------------------------
create or replace function public.add_my_role(p_role public.app_role)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'يجب تسجيل الدخول' using errcode = '42501'; end if;
  if not (p_role = any (private.self_assignable_roles())) then
    raise exception 'هذا الدور لا يمكن إضافته ذاتيًا' using errcode = '42501';
  end if;
  if private.has_role(p_role, v_uid) then return; end if;
  insert into public.user_roles (user_id, role, granted_by) values (v_uid, p_role, v_uid);
  perform private.audit('role.self_added', 'user', v_uid, jsonb_build_object('role', p_role));
end $$;

create or replace function public.remove_my_role(p_role public.app_role)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'يجب تسجيل الدخول' using errcode = '42501'; end if;
  if p_role = 'platform_admin' then
    raise exception 'لا يمكن إزالة هذا الدور ذاتيًا' using errcode = '42501';
  end if;
  update public.user_roles set revoked_at = now(), revoked_by = v_uid
  where user_id = v_uid and role = p_role and revoked_at is null;
  if found then
    perform private.audit('role.self_removed', 'user', v_uid, jsonb_build_object('role', p_role));
  end if;
end $$;

create or replace function public.admin_set_user_role(p_user uuid, p_role public.app_role, p_grant boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if not private.is_platform_admin() then
    raise exception 'صلاحية غير كافية' using errcode = '42501';
  end if;
  if p_grant then
    if private.has_role(p_role, p_user) then return; end if;
    insert into public.user_roles (user_id, role, granted_by) values (p_user, p_role, v_uid);
  else
    if p_role = 'platform_admin' and (
      select count(*) from public.user_roles where role = 'platform_admin' and revoked_at is null
    ) <= 1 then
      raise exception 'لا يمكن إزالة آخر مدير للمنصة' using errcode = 'P0001';
    end if;
    update public.user_roles set revoked_at = now(), revoked_by = v_uid
    where user_id = p_user and role = p_role and revoked_at is null;
  end if;
  perform private.audit(case when p_grant then 'role.granted' else 'role.revoked' end,
                        'user', p_user, jsonb_build_object('role', p_role));
end $$;

-- Bootstrap the first platform admin from the SQL editor (not exposed).
create or replace function private.bootstrap_platform_admin(p_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  select id into v_user from auth.users where lower(email) = lower(p_email);
  if v_user is null then raise exception 'user not found'; end if;
  insert into public.user_roles (user_id, role) values (v_user, 'platform_admin')
  on conflict do nothing;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (null, 'role.bootstrap_admin', 'user', v_user, '{}'::jsonb);
end $$;

create or replace function public.admin_list_users(p_search text default null, p_limit integer default 25, p_offset integer default 0)
returns table (id uuid, full_name text, email text, roles public.app_role[], created_at timestamptz, total_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then
    raise exception 'صلاحية غير كافية' using errcode = '42501';
  end if;
  return query
  select p.id, p.full_name, u.email::text,
         coalesce(array(select r.role from public.user_roles r
                        where r.user_id = p.id and r.revoked_at is null order by r.role), '{}'),
         p.created_at,
         count(*) over ()
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.deleted_at is null
    and (p_search is null or p_search = ''
         or p.full_name ilike '%' || p_search || '%'
         or u.email ilike '%' || p_search || '%')
  order by p.created_at desc
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
end $$;

-- Institutions ------------------------------------------------------------
create or replace function public.create_organization(
  p_name text, p_description text default null, p_country text default null,
  p_city text default null, p_contact_email text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'يجب تسجيل الدخول' using errcode = '42501'; end if;
  if not private.consume_rate_limit('create_org:' || v_uid, 3, 86400) then
    raise exception 'تجاوزت الحد المسموح، حاول لاحقًا' using errcode = 'P0001';
  end if;
  insert into public.organizations (name, description, country, city, contact_email, created_by)
  values (btrim(p_name), p_description, p_country, p_city, p_contact_email, v_uid)
  returning id into v_id;
  insert into public.organization_memberships (organization_id, user_id, role, created_by)
  values (v_id, v_uid, 'owner', v_uid);
  perform private.audit('organization.created', 'organization', v_id, '{}'::jsonb, v_id, null);
  return v_id;
end $$;

create or replace function public.create_center(
  p_name text, p_organization uuid default null, p_description text default null,
  p_country text default null, p_city text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'يجب تسجيل الدخول' using errcode = '42501'; end if;
  if p_organization is not null and not private.is_org_admin(p_organization, v_uid) then
    raise exception 'لا تملك صلاحية إدارة هذه المؤسسة' using errcode = '42501';
  end if;
  if not private.consume_rate_limit('create_center:' || v_uid, 10, 86400) then
    raise exception 'تجاوزت الحد المسموح، حاول لاحقًا' using errcode = 'P0001';
  end if;
  insert into public.centers (organization_id, name, description, country, city, created_by)
  values (p_organization, btrim(p_name), p_description, p_country, p_city, v_uid)
  returning id into v_id;
  insert into public.center_memberships (center_id, user_id, role, created_by)
  values (v_id, v_uid, 'admin', v_uid);
  perform private.audit('center.created', 'center', v_id, '{}'::jsonb, p_organization, v_id);
  return v_id;
end $$;

create or replace function public.admin_set_institution_status(
  p_kind text, p_id uuid, p_status public.institution_status
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then
    raise exception 'صلاحية غير كافية' using errcode = '42501';
  end if;
  if p_kind = 'organization' then
    update public.organizations
       set status = p_status,
           verified_at = case when p_status = 'verified' then now() else null end,
           verified_by = case when p_status = 'verified' then auth.uid() else null end
     where id = p_id;
  elsif p_kind = 'center' then
    update public.centers
       set status = p_status,
           verified_at = case when p_status = 'verified' then now() else null end,
           verified_by = case when p_status = 'verified' then auth.uid() else null end
     where id = p_id;
  else
    raise exception 'نوع غير معروف';
  end if;
  if not found then raise exception 'السجل غير موجود' using errcode = 'P0002'; end if;
  perform private.audit('institution.status_changed', p_kind, p_id, jsonb_build_object('status', p_status));
end $$;

-- Parent links -------------------------------------------------------------
-- Student generates a one-time code (valid 48h) and shares it with a parent.
create or replace function public.create_parent_link_code()
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text := '';
  v_bytes bytea;
  i integer;
begin
  if v_uid is null then raise exception 'يجب تسجيل الدخول' using errcode = '42501'; end if;
  if not private.has_role('student', v_uid) then
    raise exception 'هذه الخاصية متاحة لحساب الطالب' using errcode = '42501';
  end if;
  if not private.consume_rate_limit('link_code:' || v_uid, 10, 86400) then
    raise exception 'تجاوزت الحد المسموح، حاول لاحقًا' using errcode = 'P0001';
  end if;
  -- Invalidate older unused codes.
  update public.parent_link_codes set expires_at = now()
   where student_id = v_uid and used_at is null and expires_at > now();
  v_bytes := decode(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'hex');
  for i in 0..9 loop
    v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
  end loop;
  insert into public.parent_link_codes (student_id, code_hash, expires_at)
  values (v_uid, encode(sha256(convert_to(v_code, 'UTF8')), 'hex'), now() + interval '48 hours');
  return v_code;
end $$;

create or replace function public.redeem_parent_link_code(p_code text, p_relationship public.parent_relationship)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_code public.parent_link_codes;
  v_link uuid;
  v_name text;
begin
  if v_uid is null then raise exception 'يجب تسجيل الدخول' using errcode = '42501'; end if;
  if not private.has_role('parent', v_uid) then
    raise exception 'أضف دور ولي الأمر إلى حسابك أولًا' using errcode = '42501';
  end if;
  if not private.consume_rate_limit('redeem_code:' || v_uid, 10, 3600) then
    raise exception 'محاولات كثيرة، حاول بعد ساعة' using errcode = 'P0001';
  end if;
  select * into v_code from public.parent_link_codes
   where code_hash = encode(sha256(convert_to(upper(btrim(p_code)), 'UTF8')), 'hex')
     and used_at is null and expires_at > now()
   for update;
  if v_code.id is null then
    raise exception 'الرمز غير صحيح أو منتهي الصلاحية' using errcode = 'P0002';
  end if;
  if v_code.student_id = v_uid then
    raise exception 'لا يمكنك ربط حسابك بنفسك' using errcode = 'P0001';
  end if;
  update public.parent_link_codes set used_at = now(), used_by = v_uid where id = v_code.id;
  insert into public.parent_student_links (parent_id, student_id, relationship)
  values (v_uid, v_code.student_id, p_relationship)
  on conflict (parent_id, student_id) where status = 'active' do update set relationship = excluded.relationship
  returning id into v_link;
  select full_name into v_name from public.profiles where id = v_uid;
  perform private.notify(v_code.student_id, 'parent_link.created', 'تم ربط ولي أمر بحسابك',
                         'تم ربط حساب ' || coalesce(v_name, '') || ' بحسابك كولي أمر.', '/dashboard/profile');
  perform private.audit('parent_link.created', 'parent_student_link', v_link,
                        jsonb_build_object('student_id', v_code.student_id, 'parent_id', v_uid));
  return v_link;
end $$;

create or replace function public.revoke_parent_link(p_link uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_link public.parent_student_links;
begin
  select * into v_link from public.parent_student_links where id = p_link and status = 'active';
  if v_link.id is null or v_uid not in (v_link.parent_id, v_link.student_id) then
    raise exception 'الربط غير موجود' using errcode = 'P0002';
  end if;
  update public.parent_student_links set status = 'revoked', revoked_at = now(), revoked_by = v_uid
   where id = p_link;
  perform private.notify(case when v_uid = v_link.parent_id then v_link.student_id else v_link.parent_id end,
                         'parent_link.revoked', 'تم إلغاء ربط ولي الأمر', null, '/dashboard');
  perform private.audit('parent_link.revoked', 'parent_student_link', p_link, '{}'::jsonb);
end $$;

-- Privacy -----------------------------------------------------------------
create or replace function public.create_privacy_request(p_kind public.privacy_request_kind, p_reason text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'يجب تسجيل الدخول' using errcode = '42501'; end if;
  insert into public.privacy_requests (user_id, kind, reason) values (v_uid, p_kind, p_reason)
  on conflict (user_id, kind) where status in ('pending', 'processing') do nothing
  returning id into v_id;
  if v_id is null then
    raise exception 'لديك طلب قائم من هذا النوع' using errcode = 'P0001';
  end if;
  perform private.audit('privacy.request_created', 'privacy_request', v_id, jsonb_build_object('kind', p_kind));
  return v_id;
end $$;

create or replace function public.cancel_privacy_request(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.privacy_requests set status = 'rejected', admin_notes = 'ألغاه المستخدم'
   where id = p_id and user_id = auth.uid() and status = 'pending';
  if not found then raise exception 'الطلب غير موجود' using errcode = 'P0002'; end if;
  perform private.audit('privacy.request_cancelled', 'privacy_request', p_id, '{}'::jsonb);
end $$;

-- Notifications -----------------------------------------------------------
create or replace function public.mark_all_notifications_read()
returns void language sql security invoker set search_path = '' as $$
  update public.notifications set read_at = now()
   where user_id = auth.uid() and read_at is null;
$$;

-- Session context: what the signed-in user may act as.
create or replace function public.get_my_context()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'user_id', auth.uid(),
    'roles', coalesce((select jsonb_agg(role order by role) from public.user_roles
                        where user_id = auth.uid() and revoked_at is null), '[]'::jsonb),
    'organizations', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name, 'role', m.role, 'status', o.status))
                                from public.organization_memberships m
                                join public.organizations o on o.id = m.organization_id and o.deleted_at is null
                               where m.user_id = auth.uid() and m.status = 'active'), '[]'::jsonb),
    'centers', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'role', m.role, 'status', c.status))
                          from public.center_memberships m
                          join public.centers c on c.id = m.center_id and c.deleted_at is null
                         where m.user_id = auth.uid() and m.status = 'active'), '[]'::jsonb)
  )
$$;

-- Public directory of verified institutions (safe columns only).
create or replace function public.get_public_centers(p_search text default null, p_limit integer default 20, p_offset integer default 0)
returns table (id uuid, name text, description text, city text, country text, organization_name text, total_count bigint)
language sql stable security definer set search_path = '' as $$
  select c.id, c.name, c.description, c.city, c.country, o.name, count(*) over ()
  from public.centers c
  left join public.organizations o on o.id = c.organization_id
  where c.status = 'verified' and c.deleted_at is null
    and (c.organization_id is null or (o.status = 'verified' and o.deleted_at is null))
    and (p_search is null or p_search = '' or c.name ilike '%' || p_search || '%' or c.city ilike '%' || p_search || '%')
  order by c.name
  limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0)
$$;

-- ---------------------------------------------------------------------
-- Function privileges: nothing callable anonymously unless listed.
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;
grant execute on function
  public.add_my_role(public.app_role),
  public.remove_my_role(public.app_role),
  public.admin_set_user_role(uuid, public.app_role, boolean),
  public.admin_list_users(text, integer, integer),
  public.create_organization(text, text, text, text, text),
  public.create_center(text, uuid, text, text, text),
  public.admin_set_institution_status(text, uuid, public.institution_status),
  public.create_parent_link_code(),
  public.redeem_parent_link_code(text, public.parent_relationship),
  public.revoke_parent_link(uuid),
  public.create_privacy_request(public.privacy_request_kind, text),
  public.cancel_privacy_request(uuid),
  public.mark_all_notifications_read(),
  public.get_my_context()
to authenticated;
grant execute on function public.get_public_centers(text, integer, integer) to anon, authenticated;
revoke execute on function public.check_rate_limit(text, integer, integer) from authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
-- Internal-only helpers must not be callable by clients even indirectly.
revoke execute on function private.bootstrap_platform_admin(text) from authenticated, service_role;
revoke execute on function private.consume_rate_limit(text, integer, integer) from authenticated;
revoke execute on function private.audit(text, text, uuid, jsonb, uuid, uuid) from authenticated;
revoke execute on function private.notify(uuid, text, text, text, text) from authenticated;
revoke execute on function private.handle_new_user() from authenticated, service_role;
