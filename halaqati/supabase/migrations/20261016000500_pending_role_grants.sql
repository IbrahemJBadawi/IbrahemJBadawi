-- =====================================================================
-- Halaqati — Migration 0500: pre-approved role grants by email
-- Lets the platform owner pre-approve roles for an email address. They
-- are applied only once that address is CONFIRMED, so nobody can claim
-- them by signing up first with someone else's email.
-- Rows are added from the SQL editor (never from the app):
--   insert into private.pending_role_grants (email, roles, create_test_institutions)
--   values ('owner@example.com', '{student,parent,quran_teacher,instructor,sponsor,platform_admin}', true);
-- =====================================================================

create table private.pending_role_grants (
  email text primary key check (email = lower(btrim(email))),
  roles public.app_role[] not null,
  -- Also create a pending (non-public) organization + center owned by the
  -- user so the center-admin and org-admin contexts can be tried.
  create_test_institutions boolean not null default false,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  applied_to uuid
);
alter table private.pending_role_grants enable row level security;

create or replace function private.apply_pending_role_grants()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_grant private.pending_role_grants;
  v_org uuid;
  v_center uuid;
begin
  if new.email_confirmed_at is null then return new; end if;
  if tg_op = 'UPDATE' and old.email_confirmed_at is not null then return new; end if;
  select * into v_grant from private.pending_role_grants
   where email = lower(btrim(new.email)) and applied_at is null
   for update;
  if v_grant.email is null then return new; end if;

  insert into public.user_roles (user_id, role)
  select new.id, r from unnest(v_grant.roles) r
  where not exists (select 1 from public.user_roles x where x.user_id = new.id and x.role = r and x.revoked_at is null);

  if v_grant.create_test_institutions then
    insert into public.organizations (name, description, created_by)
    values ('دار تجريبية لحساب الإدارة', 'أُنشئت لتجربة لوحة مدير الدار. غير منشورة ويمكن حذفها.', new.id)
    returning id into v_org;
    insert into public.organization_memberships (organization_id, user_id, role, created_by)
    values (v_org, new.id, 'owner', new.id);
    insert into public.centers (organization_id, name, description, created_by)
    values (v_org, 'مركز تجريبي لحساب الإدارة', 'أُنشئ لتجربة لوحة أمير المركز. غير منشور ويمكن حذفه.', new.id)
    returning id into v_center;
    insert into public.center_memberships (center_id, user_id, role, created_by)
    values (v_center, new.id, 'admin', new.id), (v_center, new.id, 'teacher', new.id);
  end if;

  update private.pending_role_grants set applied_at = now(), applied_to = new.id where email = v_grant.email;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (null, 'role.pending_grants_applied', 'user', new.id, jsonb_build_object('roles', v_grant.roles));
  return new;
end $$;

-- Named to sort after on_auth_user_created, so the profile exists first.
create trigger on_auth_user_zz_pending_grants
  after insert or update of email_confirmed_at on auth.users
  for each row execute function private.apply_pending_role_grants();

revoke execute on function private.apply_pending_role_grants() from public, anon, authenticated, service_role;
