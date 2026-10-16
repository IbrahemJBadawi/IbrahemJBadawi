#!/usr/bin/env bash
# After Supabase Auth has migrated the auth schema, apply app migrations.
set -euo pipefail
DB="${STACK_DB:-halaqati_stack}"
PGURL="${PG_ADMIN_URL:-postgres://postgres:postgres@localhost:5432}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
psql "$PGURL/$DB" -v ON_ERROR_STOP=1 -q <<'SQL'
grant usage on schema auth, public, extensions to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.role(), auth.jwt() to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
SQL
for f in "$ROOT"/supabase/migrations/*.sql; do
  psql "$PGURL/$DB" -v ON_ERROR_STOP=1 -q -f "$f"
done
psql "$PGURL/$DB" -q -c "notify pgrst, 'reload schema'"
echo "app migrations applied"
