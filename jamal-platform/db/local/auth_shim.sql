-- =====================================================================
-- Local auth shim — for development databases only (PGlite or plain Postgres).
-- Supabase already provides the `auth` schema, `auth.users`, `auth.uid()`
-- and the `anon` / `authenticated` / `service_role` roles, so this file is
-- NEVER applied to a Supabase project. The migration runner applies it only
-- when `auth.users` does not exist yet.
-- =====================================================================

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  encrypted_password text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Same semantics as Supabase's auth.uid(): read the `sub` claim of the
-- request JWT claims set by the server for the current transaction.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(
    coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ), ''
  )::uuid
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )
$$;

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
-- service_role is not used by the app; BYPASSRLS needs superuser, so fall back without it.
do $$ begin
  create role service_role nologin bypassrls;
exception
  when duplicate_object then null;
  when insufficient_privilege then
    begin create role service_role nologin; exception when duplicate_object then null; end;
end $$;

-- On plain Postgres the connecting user must be able to SET ROLE.
do $$ begin
  execute format('grant anon, authenticated, service_role to %I', current_user);
exception when others then null; end $$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.role() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
