#!/usr/bin/env bash
# Creates a fresh local database for the Docker-free dev/test stack:
# roles like Supabase's, then Supabase Auth runs its own migrations, then ours.
set -euo pipefail
DB="${STACK_DB:-halaqati_stack}"
PGURL="${PG_ADMIN_URL:-postgres://postgres:postgres@localhost:5432}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

psql "$PGURL/postgres" -v ON_ERROR_STOP=1 -q -c "drop database if exists $DB with (force)" -c "create database $DB"
psql "$PGURL/$DB" -v ON_ERROR_STOP=1 -q <<'SQL'
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then create role authenticator login noinherit password 'authenticator'; end if;
end $$;
grant anon, authenticated, service_role to authenticator;
create schema if not exists auth;
create schema if not exists extensions;
SQL
echo "database $DB ready for auth migrations"
