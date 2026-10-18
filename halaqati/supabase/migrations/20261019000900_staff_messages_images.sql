-- =====================================================================
-- Halaqati — Migration 0900: staff channels and images.
--
--  * Staff channels («رسائل الإدارة»): adults only.
--      - center channel: the center's emirs (admins, incl. the owning
--        organization's admins) and its teachers;
--      - organization channel: the organization's owners/admins/staff
--        and the emirs of its centers.
--    Students never join these; student talk stays in halaqa messages.
--  * Images: a small photo per profile and a logo per center and
--    organization, stored as validated data URLs under the same access
--    rules as their owner. Certificates print the organization/center
--    logos, the teacher's photo, and the student's photo only when the
--    student opted in.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Staff channels
-- ---------------------------------------------------------------------
create or replace function private.is_center_teacher(p_center uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select p_center is not null and (
    private.has_center_role(p_center, 'teacher', p_user)
    or exists (select 1 from public.halaqat h join public.halaqa_memberships m on m.halaqa_id = h.id
               where h.center_id = p_center and h.deleted_at is null and m.user_id = p_user
                 and m.role in ('teacher', 'assistant') and m.status = 'active')
  )
$$;

create or replace function private.can_manage_staff_channel(p_scope text, p_id uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select case p_scope
    when 'center' then private.is_center_admin(p_id, p_user)
    when 'organization' then private.is_org_admin(p_id, p_user)
    else false end
$$;

create or replace function private.can_access_staff_channel(p_scope text, p_id uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select case p_scope
    when 'center' then private.is_center_admin(p_id, p_user) or private.is_center_teacher(p_id, p_user)
    when 'organization' then private.is_org_member(p_id, p_user)
      or exists (select 1 from public.centers c join public.center_memberships m on m.center_id = c.id
                 where c.organization_id = p_id and c.deleted_at is null and m.user_id = p_user
                   and m.role = 'admin' and m.status = 'active')
    else false end
$$;

create table public.staff_messages (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('center', 'organization')),
  scope_id uuid not null,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  is_announcement boolean not null default false,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id) on delete set null
);
create index staff_messages_idx on public.staff_messages (scope, scope_id, created_at desc);
alter table public.staff_messages enable row level security;
create policy staff_messages_select on public.staff_messages
  for select to authenticated
  using (deleted_at is null and private.can_access_staff_channel(scope, scope_id));
revoke insert, update, delete on public.staff_messages from authenticated;
revoke all on public.staff_messages from anon;

-- Every channel the caller belongs to, with whether they manage it.
create or replace function public.get_staff_channels()
returns table (scope text, scope_id uuid, name text, parent_name text, can_manage boolean, last_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with ch as (
    select 'organization'::text sc, o.id, o.name, null::text pn
      from public.organizations o
     where o.deleted_at is null and private.can_access_staff_channel('organization', o.id)
    union
    select 'center', c.id, c.name, o.name
      from public.centers c left join public.organizations o on o.id = c.organization_id
     where c.deleted_at is null and private.can_access_staff_channel('center', c.id)
  )
  select ch.sc, ch.id, ch.name, ch.pn, private.can_manage_staff_channel(ch.sc, ch.id),
         (select max(m.created_at) from public.staff_messages m where m.scope = ch.sc and m.scope_id = ch.id and m.deleted_at is null)
  from ch
  order by ch.sc desc, ch.name
$$;

create or replace function public.get_staff_messages(p_scope text, p_id uuid, p_limit integer default 100)
returns table (id uuid, author_id uuid, author_name text, author_role text, body text,
               is_announcement boolean, pinned boolean, created_at timestamptz, is_mine boolean, can_delete boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v_manage boolean := private.can_manage_staff_channel(p_scope, p_id);
begin
  if not private.can_access_staff_channel(p_scope, p_id) then
    raise exception 'هذه القناة لإدارة المؤسسة ومحفّظيها فقط' using errcode = '42501';
  end if;
  return query
  select m.id, m.author_id, coalesce(p.display_name, p.full_name),
         case when private.can_manage_staff_channel(m.scope, m.scope_id, m.author_id)
              then case m.scope when 'center' then 'أمير المركز' else 'إدارة الدار' end
              when m.scope = 'organization' then 'أمير مركز'
              else 'محفّظ' end,
         m.body, m.is_announcement, m.pinned, m.created_at,
         m.author_id = auth.uid(), v_manage or m.author_id = auth.uid()
  from public.staff_messages m join public.profiles p on p.id = m.author_id
  where m.scope = p_scope and m.scope_id = p_id and m.deleted_at is null
  order by m.created_at desc
  limit least(greatest(p_limit, 1), 200);
end $$;

create or replace function public.post_staff_message(p_scope text, p_id uuid, p_body text, p_announcement boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_manage boolean := private.can_manage_staff_channel(p_scope, p_id);
  v_id uuid;
  v_name text;
  v_link text := '/dashboard/staff-messages?c=' || p_scope || ':' || p_id;
  r record;
begin
  if v_uid is null or not private.can_access_staff_channel(p_scope, p_id) then
    raise exception 'هذه القناة لإدارة المؤسسة ومحفّظيها فقط' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 2000 then
    raise exception 'اكتب رسالة من 1 إلى 2000 حرف' using errcode = '23514';
  end if;
  if not private.consume_rate_limit('staff_msg:' || v_uid, 40, 3600) then
    raise exception 'أرسلت رسائل كثيرة، حاول بعد قليل' using errcode = 'P0001';
  end if;
  insert into public.staff_messages (scope, scope_id, author_id, body, is_announcement)
  values (p_scope, p_id, v_uid, btrim(p_body), v_manage and coalesce(p_announcement, false))
  returning id into v_id;

  if v_manage and coalesce(p_announcement, false) then
    v_name := case p_scope when 'center' then (select name from public.centers where id = p_id)
                           else (select name from public.organizations where id = p_id) end;
    for r in
      select distinct u.id from public.profiles u
       where u.id <> v_uid and u.deleted_at is null and private.can_access_staff_channel(p_scope, p_id, u.id)
         and (exists (select 1 from public.center_memberships cm where cm.user_id = u.id and cm.status = 'active')
              or exists (select 1 from public.organization_memberships om where om.user_id = u.id and om.status = 'active')
              or exists (select 1 from public.halaqa_memberships hm where hm.user_id = u.id and hm.role in ('teacher', 'assistant') and hm.status = 'active'))
    loop
      perform private.notify(r.id, 'staff.announcement', '📣 ' || v_name || ': ' || left(btrim(p_body), 80), null, v_link);
    end loop;
  end if;
  return v_id;
end $$;

create or replace function public.delete_staff_message(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_m public.staff_messages;
begin
  select * into v_m from public.staff_messages where id = p_id and deleted_at is null;
  if v_m.id is null or not (v_m.author_id = auth.uid() or private.can_manage_staff_channel(v_m.scope, v_m.scope_id)) then
    raise exception 'لا تملك صلاحية حذف هذه الرسالة' using errcode = '42501';
  end if;
  update public.staff_messages set deleted_at = now(), deleted_by = auth.uid() where id = p_id;
end $$;

create or replace function public.pin_staff_message(p_id uuid, p_pinned boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_m public.staff_messages;
begin
  select * into v_m from public.staff_messages where id = p_id and deleted_at is null;
  if v_m.id is null or not private.can_manage_staff_channel(v_m.scope, v_m.scope_id) then
    raise exception 'التثبيت متاح للإدارة فقط' using errcode = '42501';
  end if;
  update public.staff_messages set pinned = coalesce(p_pinned, false) where id = p_id;
end $$;

-- ---------------------------------------------------------------------
-- Images
-- ---------------------------------------------------------------------
alter table public.profiles add column photo_on_certificates boolean not null default false;
grant update (photo_on_certificates) on public.profiles to authenticated;

create table private.entity_images (
  entity_type text not null check (entity_type in ('profile', 'center', 'organization')),
  entity_id uuid not null,
  data text not null check (data ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$' and char_length(data) <= 300000),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  primary key (entity_type, entity_id)
);
alter table private.entity_images enable row level security;

create or replace function private.can_edit_image(p_type text, p_id uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select p_user is not null and (private.is_platform_admin() or case p_type
    when 'profile' then p_id = p_user
    when 'center' then private.is_center_admin(p_id, p_user)
    when 'organization' then private.is_org_admin(p_id, p_user)
    else false end)
$$;

-- Logos are public. A person's photo: themself, their parents, staff of
-- their halaqat, fellow halaqa members and channel colleagues; teachers'
-- photos are visible to any signed-in user.
create or replace function private.can_see_image(p_type text, p_id uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select case p_type
    when 'center' then true
    when 'organization' then true
    when 'profile' then p_user is not null and (
      p_id = p_user or private.is_platform_admin() or private.is_parent_of(p_id, p_user)
      or private.is_staff_of_student(p_id, p_user)
      or private.has_role('quran_teacher', p_id)
      or exists (select 1 from public.halaqa_memberships a join public.halaqa_memberships b on b.halaqa_id = a.halaqa_id
                 where a.user_id = p_user and b.user_id = p_id and a.status = 'active' and b.status = 'active'))
    else false end
$$;

create or replace function public.set_entity_image(p_type text, p_id uuid, p_data text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.can_edit_image(p_type, p_id) then
    raise exception 'لا تملك صلاحية تغيير هذه الصورة' using errcode = '42501';
  end if;
  if p_data is null or p_data !~ '^data:image/(png|jpeg|webp);base64,' or char_length(p_data) > 300000 then
    raise exception 'الصورة غير صالحة أو أكبر من المسموح' using errcode = '22023';
  end if;
  if not private.consume_rate_limit('image:' || auth.uid(), 30, 3600) then
    raise exception 'غيّرت الصور كثيرًا، حاول لاحقًا' using errcode = 'P0001';
  end if;
  insert into private.entity_images (entity_type, entity_id, data, updated_by)
  values (p_type, p_id, p_data, auth.uid())
  on conflict (entity_type, entity_id) do update set data = excluded.data, updated_by = excluded.updated_by, updated_at = now();
end $$;

create or replace function public.remove_entity_image(p_type text, p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.can_edit_image(p_type, p_id) then
    raise exception 'لا تملك صلاحية تغيير هذه الصورة' using errcode = '42501';
  end if;
  delete from private.entity_images where entity_type = p_type and entity_id = p_id;
end $$;

create or replace function public.get_entity_images(p_type text, p_ids uuid[])
returns table (entity_id uuid, data text)
language sql stable security definer set search_path = '' as $$
  select i.entity_id, i.data from private.entity_images i
  where i.entity_type = p_type and i.entity_id = any (p_ids[1:200]) and private.can_see_image(p_type, i.entity_id)
$$;

-- Images printed on a certificate (works for anonymous verifiers too).
create or replace function public.get_certificate_images(p_serial text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'organization', (select i.data from private.entity_images i where i.entity_type = 'organization' and i.entity_id = c2.organization_id),
    'center', (select i.data from private.entity_images i where i.entity_type = 'center' and i.entity_id = h.center_id),
    'teacher', (select i.data from private.entity_images i where i.entity_type = 'profile' and i.entity_id = c.issued_by),
    'student', case when p.photo_on_certificates and (c.show_name_publicly or c.student_id = auth.uid()
                                                      or private.is_parent_of(c.student_id))
                    then (select i.data from private.entity_images i where i.entity_type = 'profile' and i.entity_id = c.student_id) end,
    'organization_name', o.name,
    'center_name', c2.name
  )
  from public.certificates c
  join public.profiles p on p.id = c.student_id
  left join public.halaqat h on h.id = c.halaqa_id
  left join public.centers c2 on c2.id = h.center_id
  left join public.organizations o on o.id = c2.organization_id
  where c.serial = p_serial and c.revoked_at is null
$$;

-- ---------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
revoke execute on all functions in schema private from public, anon;
grant execute on function
  private.is_center_teacher(uuid, uuid), private.can_manage_staff_channel(text, uuid, uuid),
  private.can_access_staff_channel(text, uuid, uuid), private.can_edit_image(text, uuid, uuid),
  private.can_see_image(text, uuid, uuid)
to authenticated, service_role;
grant execute on function
  public.get_staff_channels(),
  public.get_staff_messages(text, uuid, integer),
  public.post_staff_message(text, uuid, text, boolean),
  public.delete_staff_message(uuid),
  public.pin_staff_message(uuid, boolean),
  public.set_entity_image(text, uuid, text),
  public.remove_entity_image(text, uuid),
  public.get_entity_images(text, uuid[]),
  public.get_certificate_images(text)
to authenticated;
grant execute on function
  public.get_public_halaqat(text, public.meeting_mode, public.halaqa_level, public.audience_gender, integer, integer),
  public.get_public_halaqa(uuid),
  public.get_public_teachers(text, integer, integer),
  public.get_public_centers(text, integer, integer),
  public.verify_certificate(text),
  public.get_vapid_public_key(),
  public.claim_push(text),
  public.prune_push_subscription(text, text),
  public.get_certificate_images(text)
to anon;
