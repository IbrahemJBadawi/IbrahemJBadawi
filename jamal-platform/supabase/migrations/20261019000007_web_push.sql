-- =====================================================================
-- Web push notifications (phone/desktop notifications, free — no provider).
-- A device subscribes either for an account (user_id) or, for guests, for
-- one order (order_id). Notifications created by the database are queued in
-- push_outbox and sent by the server; nothing here is readable by clients.
-- =====================================================================

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  order_id uuid references public.orders (id) on delete cascade,
  endpoint text not null unique check (endpoint like 'https://%'),
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  failures int not null default 0,
  created_at timestamptz not null default now(),
  last_success_at timestamptz,
  check (user_id is not null or order_id is not null)
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
create index push_subscriptions_order_idx on public.push_subscriptions (order_id);

create table public.push_outbox (
  id bigint generated always as identity primary key,
  subscription_id uuid not null references public.push_subscriptions (id) on delete cascade,
  title text not null,
  body text,
  link text check (link is null or link like '/%'),
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  attempts int not null default 0,
  queued_at timestamptz not null default now(),
  sent_at timestamptz
);
create index push_outbox_queued_idx on public.push_outbox (status, queued_at);

alter table public.push_subscriptions enable row level security;
alter table public.push_outbox enable row level security;
revoke all on public.push_subscriptions, public.push_outbox from anon, authenticated;

-- Every in-app notification also goes to the person's subscribed devices.
create or replace function public.trg_queue_push() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.push_outbox (subscription_id, title, body, link)
  select s.id, new.title_ar, new.body_ar, new.link
  from public.push_subscriptions s where s.user_id = new.user_id;
  return new;
end $$;
create trigger notifications_queue_push after insert on public.notifications
  for each row execute function public.trg_queue_push();

-- Guests: devices subscribed to one order get its customer-visible updates.
create or replace function public.trg_queue_order_push() returns trigger
language plpgsql security definer set search_path = '' as $$
declare o record;
begin
  if not new.visible_to_customer then return new; end if;
  select id, order_number, user_id, access_token into o from public.orders where id = new.order_id;
  insert into public.push_outbox (subscription_id, title, body, link)
  select s.id, 'تحديث على طلبك ' || o.order_number, coalesce(new.note, 'تم تحديث حالة طلبك.'),
         '/order/' || o.order_number || coalesce('?t=' || o.access_token, '')
  from public.push_subscriptions s
  where s.order_id = o.id and s.user_id is null;
  return new;
end $$;
create trigger order_events_queue_push after insert on public.order_events
  for each row execute function public.trg_queue_order_push();

-- Server-only key store (VAPID keys are generated on first use).
create schema if not exists app_meta;
revoke all on schema app_meta from public;
create table if not exists app_meta.secrets (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now()
);
revoke all on app_meta.secrets from public;
