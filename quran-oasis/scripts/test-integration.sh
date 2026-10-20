#!/usr/bin/env bash
# اختبار تكامل: ينشئ قاعدة مؤقتة بالمخطط والبذور، يشغّل PostgREST، ثم يشغّل اختبارات supabase-js.
# المتطلبات: Postgres (متغيرات PGHOST/PGPORT/PGUSER) و ملف PostgREST التنفيذي (POSTGREST_BIN).
set -euo pipefail
cd "$(dirname "$0")/.."
export PGDATABASE="qo_int_$$"
BIN="${POSTGREST_BIN:-postgrest}"
SECRET="local-test-secret-local-test-secret-123456"
PORT="${PGRST_PORT:-3300}"
createdb "$PGDATABASE"
cleanup() { [[ -n "${PID:-}" ]] && kill "$PID" 2>/dev/null || true; dropdb --if-exists "$PGDATABASE"; }
trap cleanup EXIT
psql -q -v ON_ERROR_STOP=1 -f supabase/tests/00_auth_shim.sql
for f in supabase/migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -f "$f"; done
psql -q -v ON_ERROR_STOP=1 -f supabase/seed.sql
psql -q -c "do \$\$ begin if not exists (select 1 from pg_roles where rolname='authenticator') then create role authenticator login noinherit password 'auth'; end if; end \$\$; grant anon, authenticated to authenticator;"
CONF=$(mktemp)
HOSTPARAM=""; [[ "${PGHOST:-localhost}" == /* ]] && HOSTPARAM="?host=${PGHOST}"
cat > "$CONF" <<CONF
db-uri = "postgres://authenticator:auth@localhost:${PGPORT:-5432}/${PGDATABASE}${HOSTPARAM}"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "${SECRET}"
server-port = ${PORT}
CONF
"$BIN" "$CONF" >/dev/null 2>&1 &
PID=$!
for _ in $(seq 1 40); do curl -sf --noproxy localhost "http://localhost:${PORT}/" >/dev/null && break; sleep 0.25; done
INTEGRATION=1 PGRST_URL="http://localhost:${PORT}" PGRST_JWT_SECRET="$SECRET" npx vitest run tests/integration
