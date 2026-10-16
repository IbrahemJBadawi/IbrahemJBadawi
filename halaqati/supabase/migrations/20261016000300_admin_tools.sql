-- =====================================================================
-- Halaqati — Migration 0300: platform admin tools
-- =====================================================================

-- Move a privacy request through its lifecycle (audited).
create or replace function public.admin_update_privacy_request(
  p_id uuid, p_status public.privacy_request_status, p_notes text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare v_req public.privacy_requests;
begin
  if not private.is_platform_admin() then
    raise exception 'صلاحية غير كافية' using errcode = '42501';
  end if;
  select * into v_req from public.privacy_requests where id = p_id for update;
  if v_req.id is null then raise exception 'الطلب غير موجود' using errcode = 'P0002'; end if;
  update public.privacy_requests
     set status = p_status,
         admin_notes = coalesce(nullif(btrim(p_notes), ''), admin_notes),
         processed_at = case when p_status in ('completed', 'rejected') then now() else processed_at end,
         processed_by = auth.uid()
   where id = p_id;
  perform private.notify(v_req.user_id, 'privacy.updated', 'تحديث على طلب الخصوصية', null, '/dashboard/profile');
  perform private.audit('privacy.request_updated', 'privacy_request', p_id,
                        jsonb_build_object('status', p_status, 'kind', v_req.kind, 'user_id', v_req.user_id));
end $$;

-- Requester names for the privacy queue (admins only).
create or replace function public.admin_list_privacy_requests(p_limit integer default 50, p_offset integer default 0)
returns table (id uuid, user_id uuid, full_name text, email text, kind public.privacy_request_kind,
               status public.privacy_request_status, reason text, admin_notes text, created_at timestamptz, total_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then
    raise exception 'صلاحية غير كافية' using errcode = '42501';
  end if;
  return query
  select r.id, r.user_id, p.full_name, u.email::text, r.kind, r.status, r.reason, r.admin_notes, r.created_at, count(*) over ()
  from public.privacy_requests r
  join public.profiles p on p.id = r.user_id
  join auth.users u on u.id = r.user_id
  order by (r.status in ('pending', 'processing')) desc, r.created_at desc
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
end $$;

revoke execute on function public.admin_update_privacy_request(uuid, public.privacy_request_status, text) from public, anon;
revoke execute on function public.admin_list_privacy_requests(integer, integer) from public, anon;
grant execute on function public.admin_update_privacy_request(uuid, public.privacy_request_status, text) to authenticated;
grant execute on function public.admin_list_privacy_requests(integer, integer) to authenticated;
