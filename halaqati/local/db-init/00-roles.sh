#!/bin/sh
# Runs once, when the data volume is created: the roles and schemas a
# Supabase-style backend expects. Supabase Auth then migrates `auth`.
set -eu
psql -v ON_ERROR_STOP=1 --username postgres --dbname "$POSTGRES_DB" \
  -v authpw="$AUTHENTICATOR_PASSWORD" <<'SQL'
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role authenticator login noinherit password :'authpw';
grant anon, authenticated, service_role to authenticator;
create schema if not exists auth;
create schema if not exists extensions;
SQL
