-- =====================================================================
-- TechMood Growth — Migration 0100: Foundation
-- Accounts, platform admins, plans, organizations (tenants), members,
-- invitations, subscriptions, usage counters, manual billing records,
-- audit log and rate limiting.
--
-- Conventions
--  * Every table in `public` has RLS enabled. Anything that needs several
--    checks, enforces plan limits or must be audited goes through a
--    SECURITY DEFINER function or trigger.
--  * Authorization helpers live in schema `private`, which PostgREST does
--    not expose.
--  * All functions pin `search_path = ''` and use schema-qualified names.
--  * Tenant tables carry `org_id` and child rows reference their parent
--    with a composite (org_id, id) foreign key, so a row can never point
--    at another tenant's data even through a bug in application code.
--
-- Rollback: this is the first migration of a dedicated project. To undo
-- it on a non-production database drop the objects it creates (see
-- docs/DATABASE.md, "Rollback"). Never run it against the TechMood or
-- Halaqati databases: Growth uses its own Supabase project.
-- =====================================================================

create schema if not exists private;
grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.member_role as enum ('owner', 'admin', 'agent', 'viewer');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled');
create type public.billing_method as enum ('bank_transfer', 'cash', 'other');
create type public.billing_status as enum ('pending', 'verified', 'rejected');
create type public.usage_metric as enum ('leads', 'ai_requests');

-- ---------------------------------------------------------------------
-- Generic triggers
-- ---------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- A row never moves to another tenant.
create or replace function private.prevent_org_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.org_id is distinct from old.org_id then
    raise exception 'لا يمكن نقل السجل إلى شركة أخرى' using errcode = '42501';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  -- Copied from auth.users so teammates can see who is who. Only visible
  -- to people who share an organization (see policy below).
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

create table public.platform_admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Plans. Limits are data, editable by platform admins; NULL = unlimited.
-- Prices are provisional (USD cents) and not final commercial terms.
-- ---------------------------------------------------------------------
create table public.plans (
  code text primary key check (code ~ '^[a-z][a-z0-9_]{1,30}$'),
  name text not null,
  description text,
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  max_members integer check (max_members is null or max_members >= 1),
  max_leads_per_month integer check (max_leads_per_month is null or max_leads_per_month >= 0),
  max_forms integer check (max_forms is null or max_forms >= 0),
  ai_requests_per_month integer check (ai_requests_per_month is null or ai_requests_per_month >= 0),
  public_booking boolean not null default true,
  advanced_reports boolean not null default false,
  is_public boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
create trigger plans_updated_at before update on public.plans
  for each row execute function private.set_updated_at();

insert into public.plans (code, name, description, price_cents, max_members, max_leads_per_month, max_forms, ai_requests_per_month, public_booking, advanced_reports, sort_order) values
  ('free', 'Free', 'للبدء والتجربة', 0, 1, 30, 1, 0, true, false, 1),
  ('starter', 'Starter', 'للمراكز الصغيرة', 1900, 3, 300, 10, 0, true, false, 2),
  ('growth', 'Growth', 'للفرق التي تنمو', 4900, 10, 1500, 50, 300, true, true, 3);

-- ---------------------------------------------------------------------
-- Organizations (tenants)
-- ---------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  industry text check (industry is null or char_length(industry) <= 60),
  country text check (country is null or char_length(country) <= 60),
  timezone text not null default 'Asia/Riyadh',
  -- Raw form submissions older than this are purged (NULL = keep).
  submission_retention_days integer check (submission_retention_days is null or submission_retention_days between 30 and 3650),
  trial_used boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger organizations_updated_at before update on public.organizations
  for each row execute function private.set_updated_at();

create or replace function private.validate_timezone()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'المنطقة الزمنية غير معروفة' using errcode = '22023';
  end if;
  return new;
end $$;
create trigger organizations_timezone before insert or update of timezone on public.organizations
  for each row execute function private.validate_timezone();

create table public.organization_members (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null,
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index organization_members_user_idx on public.organization_members (user_id);
create trigger organization_members_updated_at before update on public.organization_members
  for each row execute function private.set_updated_at();
create trigger organization_members_org before update on public.organization_members
  for each row execute function private.prevent_org_change();

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role public.member_role not null check (role <> 'owner'),
  token_hash text not null unique,
  invited_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index organization_invitations_open_unique
  on public.organization_invitations (org_id, lower(email))
  where accepted_at is null and revoked_at is null;

-- ---------------------------------------------------------------------
-- Subscriptions, usage, billing
-- ---------------------------------------------------------------------
create table public.subscriptions (
  org_id uuid primary key references public.organizations (id) on delete cascade,
  plan_code text not null references public.plans (code),
  status public.subscription_status not null default 'active',
  trial_ends_at timestamptz,
  -- NULL for the free plan (no end); set when a paid period is verified.
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function private.set_updated_at();

-- Monotonic counters per calendar month (UTC). Archiving or deleting a
-- lead does not give the quota back, so limits cannot be gamed.
create table public.usage_records (
  org_id uuid not null references public.organizations (id) on delete cascade,
  metric public.usage_metric not null,
  period_start date not null,
  used integer not null default 0 check (used >= 0),
  updated_at timestamptz not null default now(),
  primary key (org_id, metric, period_start)
);

-- Manual collection: the owner records a transfer, a platform admin
-- verifies it. No card data is ever stored.
create table public.billing_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  plan_code text not null references public.plans (code),
  months integer not null check (months between 1 and 24),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'USD',
  method public.billing_method not null,
  reference text check (reference is null or char_length(reference) <= 120),
  status public.billing_status not null default 'pending',
  submitted_by uuid references public.profiles (id) on delete set null,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_note text check (review_note is null or char_length(review_note) <= 500),
  created_at timestamptz not null default now()
);
create index billing_records_org_idx on public.billing_records (org_id, created_at desc);
create index billing_records_pending_idx on public.billing_records (created_at) where status = 'pending';

-- ---------------------------------------------------------------------
-- Audit log (append-only; written by triggers and RPCs only). Details
-- never contain lead contact data.
-- ---------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  org_id uuid references public.organizations (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_org_idx on public.audit_logs (org_id, created_at desc);

create or replace function private.audit(p_org uuid, p_action text, p_entity text, p_entity_id uuid, p_details jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_logs (org_id, actor_id, action, entity, entity_id, details)
  values (p_org, auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_details, '{}'::jsonb))
$$;

create or replace function private.block_audit_changes()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'سجل التدقيق لا يقبل التعديل' using errcode = '42501';
end $$;
create trigger audit_logs_immutable before update on public.audit_logs
  for each row execute function private.block_audit_changes();

-- ---------------------------------------------------------------------
-- Rate limiting (fixed window, in Postgres so it works serverless)
-- ---------------------------------------------------------------------
create table private.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

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
  if random() < 0.01 then
    delete from private.rate_limits where window_start < now() - interval '2 days';
  end if;
  return v_hits <= p_max;
end $$;

-- Server-side (service role) limiter for login/registration.
create or replace function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean language sql security definer set search_path = '' as $$
  select private.consume_rate_limit(p_key, p_max, p_window_seconds)
$$;

-- ---------------------------------------------------------------------
-- Authorization helpers
-- ---------------------------------------------------------------------
create or replace function private.is_platform_admin(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select p_user is not null and exists (select 1 from public.platform_admins where user_id = p_user)
$$;

create or replace function private.member_role(p_org uuid, p_user uuid default auth.uid())
returns public.member_role language sql stable security definer set search_path = '' as $$
  select role from public.organization_members where org_id = p_org and user_id = p_user
$$;

create or replace function private.is_member(p_org uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select p_user is not null and exists (select 1 from public.organization_members where org_id = p_org and user_id = p_user)
$$;

-- Owner, admin or agent: may work on leads, activities and appointments.
create or replace function private.can_write(p_org uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.member_role(p_org, p_user) in ('owner', 'admin', 'agent'), false)
$$;

-- Owner or admin: may configure forms, stages, booking and the team.
create or replace function private.is_org_admin(p_org uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.member_role(p_org, p_user) in ('owner', 'admin'), false)
$$;

create or replace function private.is_org_owner(p_org uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.member_role(p_org, p_user) = 'owner', false)
$$;

create or replace function private.shares_org(p_other uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members a
    join public.organization_members b on b.org_id = a.org_id
    where a.user_id = p_user and b.user_id = p_other
  )
$$;

-- ---------------------------------------------------------------------
-- Effective plan: a lapsed trial or paid period falls back to Free
-- without needing a scheduled job.
-- ---------------------------------------------------------------------
create or replace function private.effective_plan_code(p_org uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((
    select case
      when s.status = 'trialing' and s.trial_ends_at > now() then s.plan_code
      when s.status = 'active' and (s.current_period_end is null or s.current_period_end > now()) then s.plan_code
      else 'free'
    end
    from public.subscriptions s where s.org_id = p_org
  ), 'free')
$$;

create or replace function private.effective_plan(p_org uuid)
returns public.plans language sql stable security definer set search_path = '' as $$
  select p.* from public.plans p where p.code = private.effective_plan_code(p_org)
$$;

create or replace function private.current_period()
returns date language sql stable set search_path = '' as $$
  select (date_trunc('month', now() at time zone 'UTC'))::date
$$;

-- Atomically counts one unit and fails once the plan limit is reached.
create or replace function private.consume_usage(p_org uuid, p_metric public.usage_metric, p_limit integer, p_message text)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_used integer;
begin
  insert into public.usage_records as u (org_id, metric, period_start, used)
  values (p_org, p_metric, private.current_period(), 1)
  on conflict (org_id, metric, period_start) do update set used = u.used + 1, updated_at = now()
  returning used into v_used;
  if p_limit is not null and v_used > p_limit then
    raise exception '%', p_message using errcode = 'P0001', hint = 'plan_limit';
  end if;
  return v_used;
end $$;

-- Seats = members + open invitations.
create or replace function private.assert_seat_available(p_org uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_limit integer := (private.effective_plan(p_org)).max_members;
  v_used integer;
begin
  if v_limit is null then return; end if;
  perform 1 from public.organizations where id = p_org for update;
  select (select count(*) from public.organization_members where org_id = p_org)
       + (select count(*) from public.organization_invitations
           where org_id = p_org and accepted_at is null and revoked_at is null and expires_at > now())
    into v_used;
  if v_used >= v_limit then
    raise exception 'بلغت الحد الأقصى لأعضاء الفريق في خطتك الحالية (%). رقِّ الخطة لإضافة أعضاء.', v_limit
      using errcode = 'P0001', hint = 'plan_limit';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- New auth user → profile
-- ---------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_name text := btrim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
begin
  if char_length(v_name) < 2 then
    v_name := coalesce(nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'مستخدم');
    if char_length(v_name) < 2 then v_name := v_name || '_'; end if;
  end if;
  insert into public.profiles (id, full_name, email) values (new.id, left(v_name, 120), lower(new.email));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.sync_user_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = lower(new.email) where id = new.id;
  return new;
end $$;
create trigger on_auth_user_email after update of email on auth.users
  for each row execute function private.sync_user_email();

-- Profile owners may only change their name.
create or replace function private.guard_profile()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') and (new.email is distinct from old.email or new.id <> old.id) then
    raise exception 'لا يمكن تعديل هذا الحقل' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function private.guard_profile();

-- trial_used is managed by start_trial() only.
create or replace function private.guard_organization()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') and new.trial_used is distinct from old.trial_used then
    raise exception 'لا يمكن تعديل هذا الحقل' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger organizations_guard before update on public.organizations
  for each row execute function private.guard_organization();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.platform_admins enable row level security;
alter table public.plans enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_records enable row level security;
alter table public.billing_records enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or private.shares_org(id) or private.is_platform_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy platform_admins_select on public.platform_admins for select to authenticated
  using (user_id = auth.uid() or private.is_platform_admin());

create policy plans_select on public.plans for select to anon, authenticated
  using (is_public or private.is_platform_admin());

create policy organizations_select on public.organizations for select to authenticated
  using (private.is_member(id) or private.is_platform_admin());
create policy organizations_update on public.organizations for update to authenticated
  using (private.is_org_admin(id)) with check (private.is_org_admin(id));

create policy members_select on public.organization_members for select to authenticated
  using (private.is_member(org_id) or private.is_platform_admin());

create policy invitations_select on public.organization_invitations for select to authenticated
  using (private.is_org_admin(org_id));

create policy subscriptions_select on public.subscriptions for select to authenticated
  using (private.is_member(org_id) or private.is_platform_admin());

create policy usage_select on public.usage_records for select to authenticated
  using (private.is_member(org_id) or private.is_platform_admin());

create policy billing_select on public.billing_records for select to authenticated
  using (private.is_org_admin(org_id) or private.is_platform_admin());

create policy audit_select on public.audit_logs for select to authenticated
  using ((org_id is not null and private.is_org_admin(org_id)) or private.is_platform_admin());

-- Explicitly drop privileges no client should hold (defence in depth on
-- top of RLS). Writes to these tables happen in SECURITY DEFINER code.
revoke insert, update, delete on public.platform_admins, public.plans, public.organization_members,
  public.organization_invitations, public.subscriptions, public.usage_records, public.billing_records,
  public.audit_logs from anon, authenticated;
revoke insert, delete on public.organizations, public.profiles from anon, authenticated;
revoke all on public.profiles, public.organizations from anon;
-- Owners/admins may edit these organization columns only.
revoke update on public.organizations from authenticated;
grant update (name, industry, country, timezone, submission_retention_days) on public.organizations to authenticated;
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- Bootstrap: first platform admin, from the SQL editor only.
-- ---------------------------------------------------------------------
create or replace function private.bootstrap_platform_admin(p_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(p_email);
  if v_id is null then raise exception 'user not found'; end if;
  insert into public.platform_admins (user_id) values (v_id) on conflict do nothing;
  perform private.audit(null, 'platform_admin.bootstrap', 'profile', v_id);
end $$;
