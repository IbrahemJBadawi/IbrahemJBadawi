-- =====================================================================
-- TechMood Growth — Migration 0600: Notifications and Web Push
-- In-app notifications for the team (new lead from a public form, new
-- public booking, cancellation, invitation accepted) and the device
-- subscriptions used to deliver them as Web Push. Same model as the
-- other TechMood platforms: opt-in per device, revocable at any time.
-- =====================================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  org_id uuid references public.organizations (id) on delete cascade,
  kind text not null check (kind in ('lead', 'booking', 'booking_canceled', 'member', 'billing', 'system')),
  title text not null check (char_length(title) between 1 and 160),
  body text check (body is null or char_length(body) <= 500),
  link text check (link is null or link ~ '^/[^/]'),
  read_at timestamptz,
  pushed_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
create index notifications_push_idx on public.notifications (created_at) where pushed_at is null;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  user_agent text check (user_agent is null or char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Notifies everyone who works leads in the organization. Contact data is
-- deliberately kept out of the text (it may travel through push services).
create or replace function private.notify_team(p_org uuid, p_kind text, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, org_id, kind, title, body, link)
  select m.user_id, p_org, p_kind, p_title, p_body, p_link
  from public.organization_members m
  where m.org_id = p_org and m.role in ('owner', 'admin', 'agent')
    and m.user_id is distinct from auth.uid()
$$;

create or replace function private.notify_new_lead()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Only leads that arrived on their own (public form or booking page).
  if new.source <> 'booking' and new.form_id is not null then
    perform private.notify_team(new.org_id, 'lead', 'عميل محتمل جديد',
      'وصل طلب جديد من نموذج «' || coalesce((select name from public.forms where id = new.form_id), '') || '».',
      '/dashboard/leads/' || new.id);
  end if;
  return new;
end $$;
create trigger leads_notify after insert on public.leads
  for each row execute function private.notify_new_lead();

create or replace function private.notify_appointment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.source <> 'public' then return new; end if;
  if tg_op = 'INSERT' then
    perform private.notify_team(new.org_id, 'booking', 'حجز جديد',
      'تم حجز «' || new.title || '» عبر صفحة الحجز.', '/dashboard/appointments?focus=' || new.id);
  elsif new.status = 'canceled' and old.status <> 'canceled' and auth.uid() is null then
    perform private.notify_team(new.org_id, 'booking_canceled', 'أُلغي موعد',
      'ألغى العميل موعد «' || new.title || '».', '/dashboard/appointments?focus=' || new.id);
  elsif new.starts_at <> old.starts_at and auth.uid() is null then
    perform private.notify_team(new.org_id, 'booking', 'تغيّر موعد',
      'غيّر العميل وقت موعد «' || new.title || '».', '/dashboard/appointments?focus=' || new.id);
  end if;
  return new;
end $$;
create trigger appointments_notify after insert or update on public.appointments
  for each row execute function private.notify_appointment();

create or replace function private.notify_member_joined()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'owner' then return new; end if;
  insert into public.notifications (user_id, org_id, kind, title, body, link)
  select m.user_id, new.org_id, 'member', 'انضم عضو جديد',
         coalesce((select full_name from public.profiles where id = new.user_id), 'عضو') || ' انضم إلى الفريق.', '/dashboard/team'
  from public.organization_members m
  where m.org_id = new.org_id and m.role in ('owner', 'admin') and m.user_id <> new.user_id;
  return new;
end $$;
create trigger organization_members_notify after insert on public.organization_members
  for each row execute function private.notify_member_joined();

create or replace function private.notify_billing_review()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status <> old.status and new.status in ('verified', 'rejected') then
    insert into public.notifications (user_id, org_id, kind, title, body, link)
    select m.user_id, new.org_id, 'billing',
           case when new.status = 'verified' then 'تم تفعيل اشتراكك' else 'تعذّر التحقق من الدفعة' end,
           case when new.status = 'verified' then 'تم التحقق من الدفعة وتفعيل خطة ' || new.plan_code || '.'
                else coalesce('ملاحظة المراجعة: ' || new.review_note, 'راجع بيانات التحويل وأرسلها مجددًا.') end,
           '/dashboard/billing'
    from public.organization_members m where m.org_id = new.org_id and m.role = 'owner';
  end if;
  return new;
end $$;
create trigger billing_records_notify after update on public.billing_records
  for each row execute function private.notify_billing_review();

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns void language sql security definer set search_path = '' as $$
  update public.notifications set read_at = now()
  where user_id = auth.uid() and read_at is null and (p_ids is null or id = any (p_ids))
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

create policy notifications_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete to authenticated using (user_id = auth.uid());

create policy push_select on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
create policy push_insert on public.push_subscriptions for insert to authenticated with check (user_id = auth.uid());
create policy push_delete on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());

revoke all on public.notifications, public.push_subscriptions from anon;
revoke insert, update on public.notifications from authenticated;
revoke update on public.push_subscriptions from authenticated;

revoke execute on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
revoke execute on function
  private.notify_team(uuid, text, text, text, text),
  private.notify_new_lead(),
  private.notify_appointment(),
  private.notify_member_joined(),
  private.notify_billing_review()
from public, anon, authenticated;

-- Defence in depth: anonymous visitors hold no table privilege at all
-- except reading the public plan list. Everything public goes through
-- the narrow functions granted in 0500.
revoke all on all tables in schema public from anon;
grant select on public.plans to anon;
