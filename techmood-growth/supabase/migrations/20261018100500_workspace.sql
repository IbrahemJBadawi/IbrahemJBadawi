-- =====================================================================
-- TechMood Growth — Migration 0500: Workspace operations
-- Organization creation, team & invitations, trial, manual billing,
-- platform administration, AI usage metering, analytics, data export,
-- deletion and retention. Ends with the function privilege lockdown.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Organizations
-- ---------------------------------------------------------------------
create or replace function public.create_organization(p_name text, p_timezone text default 'Asia/Riyadh', p_country text default null, p_industry text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
begin
  if v_uid is null then raise exception 'سجّل الدخول أولًا' using errcode = '42501'; end if;
  if not private.consume_rate_limit('create_org:' || v_uid, 5, 86400) then
    raise exception 'أنشأت عدة مساحات اليوم. حاول غدًا.' using errcode = 'P0001', hint = 'rate_limit';
  end if;
  insert into public.organizations (name, timezone, country, industry, created_by)
  values (btrim(p_name), coalesce(nullif(p_timezone, ''), 'Asia/Riyadh'),
          nullif(btrim(coalesce(p_country, '')), ''), nullif(btrim(coalesce(p_industry, '')), ''), v_uid)
  returning id into v_org;
  insert into public.organization_members (org_id, user_id, role) values (v_org, v_uid, 'owner');
  insert into public.subscriptions (org_id, plan_code, status) values (v_org, 'free', 'active');
  insert into public.appointment_settings (org_id, slug) values (v_org, private.random_slug('b'));
  perform private.seed_default_stages(v_org);
  perform private.audit(v_org, 'organization.create', 'organization', v_org);
  return v_org;
end $$;

-- One free trial of the Growth plan per organization, owner only.
create or replace function public.start_trial(p_org uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_org_owner(p_org) then
    raise exception 'بدء التجربة متاح لمالك الشركة فقط' using errcode = '42501';
  end if;
  if (select trial_used from public.organizations where id = p_org) then
    raise exception 'استُخدمت الفترة التجريبية لهذه الشركة من قبل' using errcode = 'P0001';
  end if;
  if private.effective_plan_code(p_org) <> 'free' then
    raise exception 'الشركة مشتركة في خطة مدفوعة بالفعل' using errcode = 'P0001';
  end if;
  update public.organizations set trial_used = true where id = p_org;
  update public.subscriptions set plan_code = 'growth', status = 'trialing', trial_ends_at = now() + interval '14 days', current_period_end = null
  where org_id = p_org;
  perform private.audit(p_org, 'subscription.trial_start', 'organization', p_org, jsonb_build_object('plan', 'growth', 'days', 14));
end $$;

-- ---------------------------------------------------------------------
-- Team
-- ---------------------------------------------------------------------
-- Returns the raw token once; only its hash is stored.
create or replace function public.create_invitation(p_org uuid, p_email text, p_role public.member_role)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_token text := private.new_token();
  v_email text := lower(btrim(p_email));
  v_id uuid;
begin
  if not private.is_org_admin(p_org) then
    raise exception 'لا تملك صلاحية دعوة الأعضاء' using errcode = '42501';
  end if;
  if p_role = 'owner' then
    raise exception 'لا يمكن الدعوة بدور المالك' using errcode = '22023';
  end if;
  if p_role = 'admin' and not private.is_org_owner(p_org) then
    raise exception 'المالك وحده يدعو مديرين' using errcode = '42501';
  end if;
  if exists (select 1 from public.organization_members m join public.profiles p on p.id = m.user_id
             where m.org_id = p_org and p.email = v_email) then
    raise exception 'هذا الشخص عضو في الشركة بالفعل' using errcode = 'P0001';
  end if;
  if not private.consume_rate_limit('invite:' || p_org, 30, 86400) then
    raise exception 'أرسلت دعوات كثيرة اليوم' using errcode = 'P0001', hint = 'rate_limit';
  end if;
  -- Replace an older open invitation for the same address.
  update public.organization_invitations set revoked_at = now()
  where org_id = p_org and lower(email) = v_email and accepted_at is null and revoked_at is null;
  perform private.assert_seat_available(p_org);
  insert into public.organization_invitations (org_id, email, role, token_hash, invited_by)
  values (p_org, v_email, p_role, private.hash_token(v_token), auth.uid())
  returning id into v_id;
  perform private.audit(p_org, 'member.invite', 'invitation', v_id, jsonb_build_object('role', p_role));
  return jsonb_build_object('id', v_id, 'token', v_token);
end $$;

create or replace function public.revoke_invitation(p_invitation uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.organization_invitations where id = p_invitation;
  if v_org is null or not private.is_org_admin(v_org) then
    raise exception 'لا تملك صلاحية' using errcode = '42501';
  end if;
  update public.organization_invitations set revoked_at = now() where id = p_invitation and accepted_at is null;
  perform private.audit(v_org, 'member.invite_revoke', 'invitation', p_invitation);
end $$;

-- What the invite page shows before accepting (token holders only).
create or replace function public.get_invitation(p_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('org_name', o.name, 'role', i.role, 'email', i.email,
    'valid', i.accepted_at is null and i.revoked_at is null and i.expires_at > now())
  from public.organization_invitations i join public.organizations o on o.id = i.org_id
  where i.token_hash = private.hash_token(p_token)
$$;

create or replace function public.accept_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.organization_invitations;
  v_email text := lower(coalesce(auth.jwt() ->> 'email', (select email from public.profiles where id = auth.uid())));
begin
  if auth.uid() is null then raise exception 'سجّل الدخول أولًا' using errcode = '42501'; end if;
  select * into v_inv from public.organization_invitations
  where token_hash = private.hash_token(p_token) and accepted_at is null and revoked_at is null and expires_at > now()
  for update;
  if v_inv.id is null then
    raise exception 'الدعوة غير صالحة أو انتهت صلاحيتها' using errcode = 'P0002';
  end if;
  if v_email is distinct from lower(v_inv.email) then
    raise exception 'هذه الدعوة موجّهة إلى بريد إلكتروني آخر. سجّل الدخول بالحساب المدعو.' using errcode = '42501';
  end if;
  update public.organization_invitations set accepted_at = now() where id = v_inv.id;
  insert into public.organization_members (org_id, user_id, role, invited_by)
  values (v_inv.org_id, auth.uid(), v_inv.role, v_inv.invited_by)
  on conflict (org_id, user_id) do nothing;
  perform private.audit(v_inv.org_id, 'member.join', 'profile', auth.uid(), jsonb_build_object('role', v_inv.role));
  return v_inv.org_id;
end $$;

create or replace function public.set_member_role(p_org uuid, p_user uuid, p_role public.member_role)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_current public.member_role := private.member_role(p_org, p_user);
begin
  if v_current is null then raise exception 'العضو غير موجود' using errcode = 'P0002'; end if;
  if not private.is_org_admin(p_org) then raise exception 'لا تملك صلاحية' using errcode = '42501'; end if;
  -- Only the owner touches admins or ownership.
  if (v_current in ('owner', 'admin') or p_role in ('owner', 'admin')) and not private.is_org_owner(p_org) then
    raise exception 'هذا التغيير متاح للمالك فقط' using errcode = '42501';
  end if;
  if p_user = auth.uid() then raise exception 'لا يمكنك تغيير دورك بنفسك' using errcode = '42501'; end if;
  if p_role = 'owner' then
    -- Transfer of ownership: the current owner becomes an admin.
    update public.organization_members set role = 'admin' where org_id = p_org and user_id = auth.uid();
  end if;
  update public.organization_members set role = p_role where org_id = p_org and user_id = p_user;
  perform private.audit(p_org, 'member.role', 'profile', p_user, jsonb_build_object('from', v_current, 'to', p_role));
end $$;

create or replace function public.remove_member(p_org uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_role public.member_role := private.member_role(p_org, p_user);
begin
  if v_role is null then raise exception 'العضو غير موجود' using errcode = 'P0002'; end if;
  if v_role = 'owner' then raise exception 'لا يمكن إزالة المالك. انقل الملكية أولًا.' using errcode = '42501'; end if;
  if p_user <> auth.uid() then
    if not private.is_org_admin(p_org) then raise exception 'لا تملك صلاحية' using errcode = '42501'; end if;
    if v_role = 'admin' and not private.is_org_owner(p_org) then
      raise exception 'المالك وحده يزيل المديرين' using errcode = '42501';
    end if;
  end if;
  delete from public.organization_members where org_id = p_org and user_id = p_user;
  update public.leads set owner_id = null where org_id = p_org and owner_id = p_user;
  update public.appointments set assigned_to = null where org_id = p_org and assigned_to = p_user;
  perform private.audit(p_org, case when p_user = auth.uid() then 'member.leave' else 'member.remove' end, 'profile', p_user);
end $$;

-- Seat limit also applies to direct inserts by definer code paths.
create or replace function private.member_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_limit integer := (private.effective_plan(new.org_id)).max_members;
  v_count integer;
begin
  if v_limit is null or new.role = 'owner' then return new; end if;
  perform 1 from public.organizations where id = new.org_id for update;
  select count(*) into v_count from public.organization_members where org_id = new.org_id;
  if v_count >= v_limit then
    raise exception 'بلغت الحد الأقصى لأعضاء الفريق في خطتك الحالية (%). رقِّ الخطة لإضافة أعضاء.', v_limit
      using errcode = 'P0001', hint = 'plan_limit';
  end if;
  return new;
end $$;
create trigger organization_members_before_insert before insert on public.organization_members
  for each row execute function private.member_before_insert();

-- ---------------------------------------------------------------------
-- Manual billing
-- ---------------------------------------------------------------------
create or replace function public.submit_payment_notice(p_org uuid, p_plan text, p_months integer, p_method public.billing_method, p_reference text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_plan public.plans;
  v_id uuid;
begin
  if not private.is_org_owner(p_org) then
    raise exception 'إدارة الاشتراك متاحة لمالك الشركة فقط' using errcode = '42501';
  end if;
  select * into v_plan from public.plans where code = p_plan and is_public and price_cents > 0;
  if v_plan.code is null then raise exception 'الخطة غير متاحة' using errcode = '22023'; end if;
  if p_months not between 1 and 24 then raise exception 'عدد الأشهر غير صالح' using errcode = '22023'; end if;
  if (select count(*) from public.billing_records where org_id = p_org and status = 'pending') >= 3 then
    raise exception 'لديك طلبات دفع قيد المراجعة. انتظر مراجعتها.' using errcode = 'P0001';
  end if;
  insert into public.billing_records (org_id, plan_code, months, amount_cents, currency, method, reference, submitted_by)
  values (p_org, v_plan.code, p_months, v_plan.price_cents * p_months, v_plan.currency, p_method,
          nullif(left(btrim(coalesce(p_reference, '')), 120), ''), auth.uid())
  returning id into v_id;
  perform private.audit(p_org, 'billing.submit', 'billing', v_id, jsonb_build_object('plan', v_plan.code, 'months', p_months));
  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- Platform administration (no access to tenants' leads)
-- ---------------------------------------------------------------------
create or replace function public.admin_review_payment(p_record uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_rec public.billing_records;
  v_sub public.subscriptions;
  v_base timestamptz;
begin
  if not private.is_platform_admin() then raise exception 'لا تملك صلاحية' using errcode = '42501'; end if;
  select * into v_rec from public.billing_records where id = p_record and status = 'pending' for update;
  if v_rec.id is null then raise exception 'الطلب غير موجود أو تمت مراجعته' using errcode = 'P0002'; end if;
  update public.billing_records
  set status = case when p_approve then 'verified'::public.billing_status else 'rejected'::public.billing_status end,
      reviewed_by = auth.uid(), reviewed_at = now(), review_note = nullif(left(btrim(coalesce(p_note, '')), 500), '')
  where id = p_record;
  if p_approve then
    select * into v_sub from public.subscriptions where org_id = v_rec.org_id for update;
    -- Extend from the end of a still-running period of the same plan.
    v_base := case when v_sub.status = 'active' and v_sub.plan_code = v_rec.plan_code and v_sub.current_period_end > now()
                   then v_sub.current_period_end else now() end;
    update public.subscriptions
    set plan_code = v_rec.plan_code, status = 'active', trial_ends_at = null,
        current_period_end = v_base + make_interval(months => v_rec.months)
    where org_id = v_rec.org_id;
  end if;
  perform private.audit(v_rec.org_id, case when p_approve then 'billing.verify' else 'billing.reject' end, 'billing', p_record);
end $$;

create or replace function public.admin_set_subscription(p_org uuid, p_plan text, p_status public.subscription_status, p_period_end timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then raise exception 'لا تملك صلاحية' using errcode = '42501'; end if;
  if not exists (select 1 from public.plans where code = p_plan) then raise exception 'الخطة غير موجودة' using errcode = '22023'; end if;
  update public.subscriptions set plan_code = p_plan, status = p_status, current_period_end = p_period_end,
    trial_ends_at = case when p_status = 'trialing' then coalesce(p_period_end, now() + interval '14 days') else null end
  where org_id = p_org;
  perform private.audit(p_org, 'subscription.admin_set', 'organization', p_org,
    jsonb_build_object('plan', p_plan, 'status', p_status, 'period_end', p_period_end));
end $$;

create or replace function public.admin_update_plan(
  p_code text, p_price_cents integer, p_max_members integer, p_max_leads integer, p_max_forms integer,
  p_ai_requests integer, p_public_booking boolean, p_advanced_reports boolean
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then raise exception 'لا تملك صلاحية' using errcode = '42501'; end if;
  update public.plans set price_cents = p_price_cents, max_members = p_max_members, max_leads_per_month = p_max_leads,
    max_forms = p_max_forms, ai_requests_per_month = p_ai_requests, public_booking = p_public_booking,
    advanced_reports = p_advanced_reports
  where code = p_code;
  if not found then raise exception 'الخطة غير موجودة' using errcode = 'P0002'; end if;
  perform private.audit(null, 'plan.update', 'plan', null, jsonb_build_object('code', p_code));
end $$;

-- Tenant overview without any lead data.
create or replace function public.admin_list_organizations(p_search text default null, p_limit integer default 50, p_offset integer default 0)
returns table (id uuid, name text, country text, created_at timestamptz, plan_code text, effective_plan text,
               status public.subscription_status, current_period_end timestamptz, trial_ends_at timestamptz,
               members bigint, leads_this_month integer, pending_payments bigint, total_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then raise exception 'لا تملك صلاحية' using errcode = '42501'; end if;
  return query
  select o.id, o.name, o.country, o.created_at, s.plan_code, private.effective_plan_code(o.id), s.status,
         s.current_period_end, s.trial_ends_at,
         (select count(*) from public.organization_members m where m.org_id = o.id),
         coalesce((select u.used from public.usage_records u where u.org_id = o.id and u.metric = 'leads' and u.period_start = private.current_period()), 0),
         (select count(*) from public.billing_records b where b.org_id = o.id and b.status = 'pending'),
         count(*) over ()
  from public.organizations o
  left join public.subscriptions s on s.org_id = o.id
  where p_search is null or p_search = '' or o.name ilike '%' || p_search || '%'
  order by o.created_at desc
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
end $$;

create or replace function public.admin_platform_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then raise exception 'لا تملك صلاحية' using errcode = '42501'; end if;
  return jsonb_build_object(
    'organizations', (select count(*) from public.organizations),
    'users', (select count(*) from public.profiles),
    'paying', (select count(*) from public.subscriptions s where s.status = 'active' and s.plan_code <> 'free' and (s.current_period_end is null or s.current_period_end > now())),
    'trialing', (select count(*) from public.subscriptions s where s.status = 'trialing' and s.trial_ends_at > now()),
    'pending_payments', (select count(*) from public.billing_records where status = 'pending'),
    'leads_this_month', coalesce((select sum(used) from public.usage_records where metric = 'leads' and period_start = private.current_period()), 0)
  );
end $$;

-- ---------------------------------------------------------------------
-- AI usage metering (called by the server before each AI request)
-- ---------------------------------------------------------------------
create or replace function public.consume_ai_request(p_org uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_plan public.plans := private.effective_plan(p_org);
  v_used integer;
begin
  if not private.can_write(p_org) then raise exception 'لا تملك صلاحية استخدام المساعد' using errcode = '42501'; end if;
  if coalesce(v_plan.ai_requests_per_month, 1) = 0 then
    raise exception 'المساعد الذكي متاح في خطة Growth أو خلال الفترة التجريبية' using errcode = 'P0001', hint = 'plan_limit';
  end if;
  if not private.consume_rate_limit('ai:' || auth.uid(), 20, 600) then
    raise exception 'طلبات كثيرة للمساعد. انتظر بضع دقائق.' using errcode = 'P0001', hint = 'rate_limit';
  end if;
  v_used := private.consume_usage(p_org, 'ai_requests', v_plan.ai_requests_per_month,
    format('استُنفد رصيد المساعد الذكي لهذا الشهر (%s طلب).', v_plan.ai_requests_per_month));
  return jsonb_build_object('used', v_used, 'limit', v_plan.ai_requests_per_month);
end $$;

-- ---------------------------------------------------------------------
-- Context and usage for the signed-in user
-- ---------------------------------------------------------------------
create or replace function public.get_my_context()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'is_platform_admin', private.is_platform_admin(),
    'organizations', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name, 'role', m.role, 'timezone', o.timezone,
                                          'plan', private.effective_plan_code(o.id)) order by m.created_at)
      from public.organization_members m join public.organizations o on o.id = m.org_id
      where m.user_id = auth.uid()), '[]'::jsonb)
  )
$$;

create or replace function public.get_org_usage(p_org uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_plan public.plans := private.effective_plan(p_org);
begin
  if not private.is_member(p_org) then raise exception 'لا تملك صلاحية' using errcode = '42501'; end if;
  return jsonb_build_object(
    'plan', to_jsonb(v_plan),
    'subscription', (select to_jsonb(s) from public.subscriptions s where s.org_id = p_org),
    'trial_used', (select trial_used from public.organizations where id = p_org),
    'period_start', private.current_period(),
    'leads', coalesce((select used from public.usage_records where org_id = p_org and metric = 'leads' and period_start = private.current_period()), 0),
    'ai_requests', coalesce((select used from public.usage_records where org_id = p_org and metric = 'ai_requests' and period_start = private.current_period()), 0),
    'members', (select count(*) from public.organization_members where org_id = p_org),
    'pending_invitations', (select count(*) from public.organization_invitations where org_id = p_org and accepted_at is null and revoked_at is null and expires_at > now()),
    'forms', (select count(*) from public.forms where org_id = p_org and status <> 'archived')
  );
end $$;

-- ---------------------------------------------------------------------
-- Analytics. Every number is computed from rows in the given period:
--   leads            = leads created in [from, to)
--   new_leads        = of those, still in a "new" stage
--   qualified        = of those, currently in qualified/booked/won stages
--   won              = of those, currently in a won stage
--   conversion_rate  = won / leads (NULL when there are no leads)
--   appointments_*   = appointments starting in [from, to) by status
-- Advanced sections (comparison, funnel, forms, campaigns) are returned
-- only when the effective plan includes advanced reports.
-- ---------------------------------------------------------------------
create or replace function private.lead_kpis(p_org uuid, p_from timestamptz, p_to timestamptz)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'leads', count(*),
    'new_leads', count(*) filter (where s.category = 'new'),
    'qualified', count(*) filter (where s.category in ('qualified', 'booked', 'won')),
    'won', count(*) filter (where s.category = 'won'),
    'lost', count(*) filter (where s.category = 'lost'),
    'conversion_rate', case when count(*) = 0 then null else round(count(*) filter (where s.category = 'won')::numeric / count(*), 4) end
  )
  from public.leads l join public.pipeline_stages s on s.id = l.stage_id
  where l.org_id = p_org and l.created_at >= p_from and l.created_at < p_to
$$;

create or replace function public.org_analytics(p_org uuid, p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_advanced boolean := (private.effective_plan(p_org)).advanced_reports;
  v_span interval := p_to - p_from;
  v_out jsonb;
begin
  if not private.is_member(p_org) then raise exception 'لا تملك صلاحية' using errcode = '42501'; end if;
  if p_to <= p_from or v_span > interval '400 days' then raise exception 'الفترة غير صالحة' using errcode = '22023'; end if;

  v_out := jsonb_build_object(
    'advanced', v_advanced,
    'kpis', private.lead_kpis(p_org, p_from, p_to),
    'by_source', coalesce((
      select jsonb_agg(jsonb_build_object('key', source, 'count', n) order by n desc)
      from (select l.source, count(*) n from public.leads l
            where l.org_id = p_org and l.created_at >= p_from and l.created_at < p_to group by 1) x), '[]'::jsonb),
    'by_stage', coalesce((
      select jsonb_agg(jsonb_build_object('key', s.name, 'category', s.category, 'count', coalesce(x.n, 0)) order by s.position)
      from public.pipeline_stages s
      left join (select l.stage_id, count(*) n from public.leads l
                 where l.org_id = p_org and l.created_at >= p_from and l.created_at < p_to group by 1) x on x.stage_id = s.id
      where s.org_id = p_org), '[]'::jsonb),
    'appointments', (
      select jsonb_build_object(
        'total', count(*),
        'booked', count(*) filter (where status in ('booked', 'confirmed')),
        'completed', count(*) filter (where status = 'completed'),
        'canceled', count(*) filter (where status = 'canceled'),
        'no_show', count(*) filter (where status = 'no_show'))
      from public.appointments where org_id = p_org and starts_at >= p_from and starts_at < p_to),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d, 'count', n) order by d)
      from (select (l.created_at at time zone o.timezone)::date d, count(*) n
            from public.leads l join public.organizations o on o.id = l.org_id
            where l.org_id = p_org and l.created_at >= p_from and l.created_at < p_to group by 1) x), '[]'::jsonb)
  );

  if v_advanced then
    v_out := v_out || jsonb_build_object(
      'previous', private.lead_kpis(p_org, p_from - v_span, p_from),
      'forms', coalesce((
        select jsonb_agg(jsonb_build_object('key', f.name, 'submissions', x.subs, 'won', x.won) order by x.subs desc)
        from public.forms f join (
          select fs.form_id, count(*) subs,
                 count(*) filter (where st.category = 'won') won
          from public.form_submissions fs
          left join public.leads l on l.id = fs.lead_id
          left join public.pipeline_stages st on st.id = l.stage_id
          where fs.org_id = p_org and fs.created_at >= p_from and fs.created_at < p_to group by 1) x on x.form_id = f.id), '[]'::jsonb),
      'campaigns', coalesce((
        select jsonb_agg(jsonb_build_object('key', c, 'count', n, 'won', w) order by n desc)
        from (select l.utm_campaign c, count(*) n, count(*) filter (where s.category = 'won') w
              from public.leads l join public.pipeline_stages s on s.id = l.stage_id
              where l.org_id = p_org and l.utm_campaign is not null and l.created_at >= p_from and l.created_at < p_to
              group by 1) x), '[]'::jsonb)
    );
  end if;
  return v_out;
end $$;

-- ---------------------------------------------------------------------
-- Privacy: export, erasure, retention
-- ---------------------------------------------------------------------
create or replace function public.export_organization_data(p_org uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_org_owner(p_org) then raise exception 'التصدير متاح لمالك الشركة فقط' using errcode = '42501'; end if;
  perform private.audit(p_org, 'organization.export', 'organization', p_org);
  return jsonb_build_object(
    'exported_at', now(),
    'organization', (select to_jsonb(o) from public.organizations o where o.id = p_org),
    'stages', coalesce((select jsonb_agg(to_jsonb(s)) from public.pipeline_stages s where s.org_id = p_org), '[]'::jsonb),
    'leads', coalesce((select jsonb_agg(to_jsonb(l) - 'email_norm' - 'phone_norm') from public.leads l where l.org_id = p_org), '[]'::jsonb),
    'activities', coalesce((select jsonb_agg(to_jsonb(a)) from public.lead_activities a where a.org_id = p_org), '[]'::jsonb),
    'forms', coalesce((select jsonb_agg(to_jsonb(f)) from public.forms f where f.org_id = p_org), '[]'::jsonb),
    'form_fields', coalesce((select jsonb_agg(to_jsonb(f)) from public.form_fields f where f.org_id = p_org), '[]'::jsonb),
    'submissions', coalesce((select jsonb_agg(to_jsonb(s)) from public.form_submissions s where s.org_id = p_org), '[]'::jsonb),
    'appointments', coalesce((select jsonb_agg(to_jsonb(a) - 'manage_token_hash') from public.appointments a where a.org_id = p_org), '[]'::jsonb)
  );
end $$;

-- Note: STABLE functions cannot write, so the export audit above is
-- recorded by this wrapper instead.
alter function public.export_organization_data(uuid) volatile;

create or replace function public.delete_organization(p_org uuid, p_confirm_name text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_org_owner(p_org) then raise exception 'الحذف متاح لمالك الشركة فقط' using errcode = '42501'; end if;
  if btrim(coalesce(p_confirm_name, '')) <> (select name from public.organizations where id = p_org) then
    raise exception 'اكتب اسم الشركة كما هو لتأكيد الحذف' using errcode = '22023';
  end if;
  perform private.audit(null, 'organization.delete', 'organization', p_org);
  delete from public.organizations where id = p_org;
end $$;

-- Raw submissions past the organization's retention window. Schedule
-- with pg_cron (see docs/OPERATIONS.md) or run manually.
create or replace function private.purge_expired_submissions()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  delete from public.form_submissions fs using public.organizations o
  where o.id = fs.org_id and o.submission_retention_days is not null
    and fs.created_at < now() - make_interval(days => o.submission_retention_days);
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- ---------------------------------------------------------------------
-- Function privileges: nothing is callable unless listed here.
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon;
-- RLS policies call the private helpers as the requesting role.
grant execute on all functions in schema private to authenticated, service_role;
revoke execute on function
  private.bootstrap_platform_admin(text),
  private.consume_rate_limit(text, integer, integer),
  private.consume_usage(uuid, public.usage_metric, integer, text),
  private.audit(uuid, text, text, uuid, jsonb),
  private.handle_new_user(),
  private.sync_user_email(),
  private.seed_default_stages(uuid),
  private.seed_default_fields(uuid, uuid),
  private.purge_expired_submissions(),
  private.assert_seat_available(uuid)
from authenticated;
revoke execute on function private.bootstrap_platform_admin(text) from service_role;

grant execute on function
  public.create_organization(text, text, text, text),
  public.start_trial(uuid),
  public.create_invitation(uuid, text, public.member_role),
  public.revoke_invitation(uuid),
  public.get_invitation(text),
  public.accept_invitation(text),
  public.set_member_role(uuid, uuid, public.member_role),
  public.remove_member(uuid, uuid),
  public.submit_payment_notice(uuid, text, integer, public.billing_method, text),
  public.admin_review_payment(uuid, boolean, text),
  public.admin_set_subscription(uuid, text, public.subscription_status, timestamptz),
  public.admin_update_plan(text, integer, integer, integer, integer, integer, boolean, boolean),
  public.admin_list_organizations(text, integer, integer),
  public.admin_platform_stats(),
  public.consume_ai_request(uuid),
  public.get_my_context(),
  public.get_org_usage(uuid),
  public.org_analytics(uuid, timestamptz, timestamptz),
  public.export_organization_data(uuid),
  public.delete_organization(uuid, text),
  public.create_form(uuid, text, text),
  public.get_org_slots(uuid, date, integer),
  public.log_appointment_email(uuid, text, text, public.email_status, text)
to authenticated;

-- The public surface: published forms, booking pages, manage-by-token.
grant execute on function
  public.get_public_form(text),
  public.submit_public_form(text, jsonb, boolean, jsonb, text),
  public.get_public_booking(text),
  public.get_public_slots(text, date, integer),
  public.book_public_appointment(text, timestamptz, text, text, text, text, boolean, text),
  public.get_public_appointment(text),
  public.cancel_public_appointment(text),
  public.reschedule_public_appointment(text, timestamptz),
  public.log_appointment_email(uuid, text, text, public.email_status, text)
to anon, authenticated;

revoke execute on function public.check_rate_limit(text, integer, integer) from anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
