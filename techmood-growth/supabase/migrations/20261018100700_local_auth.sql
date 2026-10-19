-- =====================================================================
-- TechMood Growth — Migration 0700: Built-in authentication support
-- The app's own sign-in (bcrypt hashes in auth.users, signed session
-- cookie) needs single-use password reset tokens. Only hashes are kept,
-- in the private schema, which no client role can reach.
-- =====================================================================

create table private.password_resets (
  token_hash text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index password_resets_user_idx on private.password_resets (user_id);
revoke all on private.password_resets from public, anon, authenticated;
