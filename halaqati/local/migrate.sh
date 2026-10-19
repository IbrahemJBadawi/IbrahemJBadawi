#!/bin/sh
# Applies Halaqati's migrations once each (tracked in halaqati_meta), after
# Supabase Auth has created the auth schema. Safe to run on every start.
set -eu
export PGHOST=db PGUSER=postgres PGDATABASE=halaqati

echo "waiting for the auth schema…"
prev=""
while :; do
  n=$(psql -tAc "select count(*) from information_schema.tables where table_schema = 'auth'" 2>/dev/null || echo 0)
  if [ "$n" != "0" ] && [ "$n" = "$prev" ] && psql -tAc "select 1 from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'auth' and p.proname = 'jwt'" | grep -q 1; then
    break
  fi
  prev=$n
  sleep 3
done

psql -v ON_ERROR_STOP=1 -q <<'SQL'
create schema if not exists halaqati_meta;
revoke all on schema halaqati_meta from public;
create table if not exists halaqati_meta.applied (name text primary key, applied_at timestamptz not null default now());
grant usage on schema auth, public, extensions to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.role(), auth.jwt() to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
SQL

for f in /migrations/*.sql; do
  name=$(basename "$f")
  if [ -z "$(psql -tAc "select 1 from halaqati_meta.applied where name = '$name'")" ]; then
    echo "applying $name"
    psql -v ON_ERROR_STOP=1 -q -1 -f "$f"
    psql -q -c "insert into halaqati_meta.applied (name) values ('$name')"
  fi
done

# Pre-approve every role for the owner's email (applied when they sign up).
if [ -n "${ADMIN_EMAIL:-}" ]; then
  psql -v ON_ERROR_STOP=1 -q -v email="$ADMIN_EMAIL" <<'SQL'
insert into private.pending_role_grants (email, roles, create_test_institutions)
values (lower(btrim(:'email')), '{student,parent,quran_teacher,instructor,sponsor,platform_admin}', true)
on conflict (email) do nothing;
SQL
fi

psql -q -c "notify pgrst, 'reload schema'"
echo "database ready"
