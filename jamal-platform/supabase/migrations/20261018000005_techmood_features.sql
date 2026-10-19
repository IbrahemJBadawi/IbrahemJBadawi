-- =====================================================================
-- Al Jamal — features carried over from TechMood (additive):
--   1. Notifications (in-app) + preferences + e-mail outbox
--   2. Support tickets with messages and an event log
--   3. Invoices issued by the database when a payment is confirmed,
--      plus customer refund-receiving accounts
--   4. AI shopping assistant: threads, messages, call quota log
-- Notifications are written by triggers together with the event itself,
-- so a notification (or an e-mail) can never exist for something that did
-- not happen. E-mails stay queued until a provider key is configured.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Notifications
-- ---------------------------------------------------------------------
create table public.notification_categories (
  kind text primary key,
  title_ar text not null,
  detail_ar text,
  admin_only boolean not null default false,
  is_mandatory boolean not null default false,
  email_default boolean not null default false,
  sort_order int not null default 0
);
insert into public.notification_categories (kind, title_ar, detail_ar, admin_only, is_mandatory, email_default, sort_order) values
  ('order_update', 'تحديثات طلباتي', 'اعتماد السعر، رفض أو قبول إثبات الدفع، الشحن والتسليم.', false, true, true, 1),
  ('ticket_reply', 'ردود الدعم', 'رد فريق خدمة العملاء على تذاكرك.', false, false, true, 2),
  ('invoice', 'الفواتير', 'إصدار فاتورة بعد تأكيد الدفع.', false, false, false, 3),
  ('admin_new_order', 'طلب جديد', 'وصول طلب جديد يحتاج مراجعة.', true, false, true, 10),
  ('admin_payment_proof', 'إثبات تحويل جديد', 'رفع العميل إثبات تحويل بانتظار التحقق.', true, false, true, 11),
  ('admin_cancel_request', 'طلب إلغاء', 'عميل طلب إلغاء طلب.', true, false, true, 12),
  ('admin_return', 'طلب إرجاع/استبدال', 'طلب إرجاع أو استبدال جديد.', true, false, false, 13),
  ('admin_ticket', 'تذاكر الدعم', 'تذكرة جديدة أو رد من عميل.', true, false, false, 14)
on conflict (kind) do nothing;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null references public.notification_categories (kind),
  title_ar text not null,
  body_ar text,
  link text check (link is null or link like '/%'),
  entity_type text,
  entity_id uuid,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);

create table public.notification_preferences (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null references public.notification_categories (kind) on delete cascade,
  in_app boolean not null default true,
  email boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind)
);

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.notifications (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  to_email text not null,
  subject text not null,
  body_ar text not null,
  action_url text,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'skipped')),
  attempts int not null default 0,
  last_error text,
  queued_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz
);
create index email_outbox_status_idx on public.email_outbox (status, queued_at);

-- The single entry point that writes a notification (and queues an e-mail)
-- while honouring the person's preferences.
create or replace function public.notify(
  p_user uuid, p_kind text, p_title text, p_body text, p_link text, p_entity_type text, p_entity_id uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  cat public.notification_categories;
  pref public.notification_preferences;
  nid uuid;
  addr text;
begin
  if p_user is null then return null; end if;
  select * into cat from public.notification_categories where kind = p_kind;
  if not found then return null; end if;
  select * into pref from public.notification_preferences where user_id = p_user and kind = p_kind;
  if found and not pref.in_app and not cat.is_mandatory then return null; end if;
  insert into public.notifications (user_id, kind, title_ar, body_ar, link, entity_type, entity_id)
  values (p_user, p_kind, p_title, p_body, p_link, p_entity_type, p_entity_id)
  returning id into nid;
  if coalesce(pref.email, cat.email_default) then
    select email into addr from auth.users where id = p_user;
    if addr is not null then
      insert into public.email_outbox (notification_id, user_id, to_email, subject, body_ar, action_url)
      values (nid, p_user, addr, p_title, coalesce(p_body, p_title), p_link);
    end if;
  end if;
  return nid;
end $$;
revoke execute on function public.notify(uuid, text, text, text, text, text, uuid) from public, anon, authenticated;

create or replace function public.notify_admins(p_kind text, p_title text, p_body text, p_link text, p_entity_type text, p_entity_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare a record;
begin
  for a in select id from public.profiles where role = 'admin' loop
    perform public.notify(a.id, p_kind, p_title, p_body, p_link, p_entity_type, p_entity_id);
  end loop;
end $$;
revoke execute on function public.notify_admins(text, text, text, text, text, uuid) from public, anon, authenticated;

-- Customer-visible order events → notify the (registered) customer.
create or replace function public.trg_notify_order_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare o record;
begin
  if not new.visible_to_customer then return new; end if;
  select id, order_number, user_id into o from public.orders where id = new.order_id;
  if o.user_id is not null and (new.actor_id is null or new.actor_id <> o.user_id) then
    perform public.notify(o.user_id, 'order_update', 'تحديث على طلبك ' || o.order_number,
      coalesce(new.note, 'تم تحديث حالة طلبك.'), '/account/orders/' || o.order_number, 'order', o.id);
  end if;
  return new;
end $$;
create trigger order_events_notify after insert on public.order_events
  for each row execute function public.trg_notify_order_event();

create or replace function public.trg_notify_admin_order() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify_admins('admin_new_order', 'طلب جديد ' || new.order_number,
      new.customer_name || ' — ' || coalesce(new.governorate_name, new.city), '/admin/orders/' || new.id, 'order', new.id);
  elsif new.status = 'cancel_requested' and old.status <> 'cancel_requested' then
    perform public.notify_admins('admin_cancel_request', 'طلب إلغاء للطلب ' || new.order_number,
      coalesce(new.cancel_reason, 'بدون سبب'), '/admin/orders/' || new.id, 'order', new.id);
  end if;
  return new;
end $$;
create trigger orders_notify_admin after insert or update of status on public.orders
  for each row execute function public.trg_notify_admin_order();

create or replace function public.trg_notify_admin_proof() returns trigger
language plpgsql security definer set search_path = '' as $$
declare n text;
begin
  if new.source <> 'customer' then return new; end if;
  select order_number into n from public.orders where id = new.order_id;
  perform public.notify_admins('admin_payment_proof', 'إثبات تحويل للطلب ' || n,
    'المبلغ المعلن: ' || new.declared_amount || ' ' || new.currency_code, '/admin/orders/' || new.order_id, 'order', new.order_id);
  return new;
end $$;
create trigger payment_proofs_notify after insert on public.payment_proofs
  for each row execute function public.trg_notify_admin_proof();

create or replace function public.trg_notify_admin_return() returns trigger
language plpgsql security definer set search_path = '' as $$
declare n text;
begin
  select order_number into n from public.orders where id = new.order_id;
  perform public.notify_admins('admin_return', 'طلب إرجاع/استبدال للطلب ' || n, left(new.reason, 140), '/admin/orders/' || new.order_id, 'order', new.order_id);
  return new;
end $$;
create trigger return_requests_notify after insert on public.return_requests
  for each row execute function public.trg_notify_admin_return();

-- ---------------------------------------------------------------------
-- 2. Support tickets
-- ---------------------------------------------------------------------
create sequence public.ticket_code_seq start 1001;

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('TK-' || nextval('public.ticket_code_seq')),
  user_id uuid references auth.users (id) on delete set null,
  guest_name text,
  guest_phone text,
  access_token text unique,
  order_id uuid references public.orders (id) on delete set null,
  category text not null default 'other'
    check (category in ('order', 'payment', 'delivery', 'return', 'product', 'account', 'other')),
  subject_ar text not null check (char_length(subject_ar) between 3 and 160),
  status text not null default 'open'
    check (status in ('open', 'waiting_staff', 'waiting_customer', 'resolved', 'closed')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  assigned_to uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (user_id is not null or (guest_name is not null and guest_phone is not null))
);
create index support_tickets_status_idx on public.support_tickets (status, updated_at desc);
create index support_tickets_user_idx on public.support_tickets (user_id);
create trigger support_tickets_updated_at before update on public.support_tickets
  for each row execute function public.set_updated_at();

create table public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  author_kind text not null check (author_kind in ('customer', 'staff', 'system')),
  author_id uuid references auth.users (id) on delete set null,
  body_ar text not null check (char_length(body_ar) between 1 and 4000),
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);
create index ticket_messages_ticket_idx on public.ticket_messages (ticket_id, created_at);

create table public.ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  kind text not null,
  actor_id uuid references auth.users (id) on delete set null,
  note_ar text,
  is_internal boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.trg_notify_ticket_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare t record;
begin
  select id, code, user_id, subject_ar into t from public.support_tickets where id = new.ticket_id;
  if new.author_kind = 'customer' then
    perform public.notify_admins('admin_ticket', 'تذكرة ' || t.code || ': ' || t.subject_ar, left(new.body_ar, 140), '/admin/tickets/' || t.id, 'ticket', t.id);
  elsif new.author_kind = 'staff' and not new.is_internal and t.user_id is not null then
    perform public.notify(t.user_id, 'ticket_reply', 'رد على تذكرتك ' || t.code, left(new.body_ar, 140), '/support/' || t.code, 'ticket', t.id);
  end if;
  return new;
end $$;
create trigger ticket_messages_notify after insert on public.ticket_messages
  for each row execute function public.trg_notify_ticket_message();

-- ---------------------------------------------------------------------
-- 3. Invoices (issued by the database when an order becomes paid) and
--    customer refund-receiving accounts
-- ---------------------------------------------------------------------
alter table public.store_settings
  add column legal_name text,
  add column tax_number text,
  add column invoice_footer text,
  add column ai_assistant_enabled boolean not null default false;

create sequence public.invoice_seq start 1;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null unique,
  order_id uuid not null unique references public.orders (id) on delete restrict,
  user_id uuid references auth.users (id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  address_ar text not null,
  currency_code char(3) not null,
  lines jsonb not null check (jsonb_typeof(lines) = 'array'),
  subtotal numeric(12,3) not null,
  discount_total numeric(12,3) not null,
  shipping_cost numeric(12,3) not null,
  fees_total numeric(12,3) not null,
  fees_label text,
  total numeric(12,3) not null,
  amount_paid numeric(12,3) not null,
  payment_method text not null,
  payment_reference text,
  seller_name text,
  seller_tax_number text,
  status text not null default 'issued' check (status in ('issued', 'partially_refunded', 'refunded')),
  refunded_amount numeric(12,3) not null default 0,
  issued_at timestamptz not null default now(),
  refunded_at timestamptz
);

create or replace function public.trg_issue_invoice() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  s record;
  lines jsonb;
  inv_no text;
  inv_id uuid;
begin
  if new.payment_status = 'paid' and old.payment_status is distinct from 'paid'
     and not exists (select 1 from public.invoices where order_id = new.id) then
    select legal_name, store_name_ar, tax_number into s from public.store_settings where id = 1;
    select coalesce(jsonb_agg(jsonb_build_object('name', product_name, 'variant', variant_label, 'qty', quantity,
             'unit', unit_price, 'total', line_total) order by product_name), '[]'::jsonb)
      into lines from public.order_items where order_id = new.id;
    inv_no := 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoice_seq')::text, 6, '0');
    insert into public.invoices (invoice_no, order_id, user_id, customer_name, customer_phone, address_ar, currency_code, lines,
      subtotal, discount_total, shipping_cost, fees_total, fees_label, total, amount_paid, payment_method, payment_reference,
      seller_name, seller_tax_number)
    values (inv_no, new.id, new.user_id, new.customer_name, new.customer_phone,
      concat_ws(' — ', new.governorate_name, new.city, new.address_line), new.currency_code, lines,
      new.subtotal, new.discount_total, new.shipping_cost, new.fees_total, new.fees_label, new.total, new.amount_collected,
      new.payment_method, new.payment_reference, coalesce(s.legal_name, s.store_name_ar), s.tax_number)
    returning id into inv_id;
    if new.user_id is not null then
      perform public.notify(new.user_id, 'invoice', 'فاتورة طلبك ' || new.order_number, 'رقم الفاتورة ' || inv_no,
        '/account/orders/' || new.order_number || '/invoice', 'invoice', inv_id);
    end if;
  end if;
  -- Refunds mark the invoice; it is never deleted or rewritten.
  if new.payment_status in ('refunded', 'partially_refunded') and old.payment_status is distinct from new.payment_status then
    update public.invoices i set status = new.payment_status,
      refunded_amount = (select coalesce(sum(amount), 0) from public.refunds r where r.order_id = new.id and r.status = 'completed'),
      refunded_at = now()
    where i.order_id = new.id;
  end if;
  return new;
end $$;
create trigger orders_issue_invoice after update of payment_status on public.orders
  for each row execute function public.trg_issue_invoice();

-- Where the customer wants a refund sent (personal financial data: admins only).
create table public.refund_accounts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  holder_name text not null check (char_length(holder_name) between 2 and 120),
  method_label text not null check (char_length(method_label) between 2 and 80),
  account_ref text not null check (char_length(account_ref) between 3 and 120),
  created_at timestamptz not null default now()
);
create index refund_accounts_order_idx on public.refund_accounts (order_id);

-- ---------------------------------------------------------------------
-- 4. AI shopping assistant
-- ---------------------------------------------------------------------
create table public.ai_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title_ar text not null default 'محادثة جديدة',
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index ai_threads_user_idx on public.ai_threads (user_id, last_message_at desc);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.ai_threads (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  model text,
  error_ar text,
  created_at timestamptz not null default now()
);
create index ai_messages_thread_idx on public.ai_messages (thread_id, created_at);

-- One row per model call: the daily quota is counted from here.
create table public.ai_model_calls (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  client_key text,
  model text not null,
  input_tokens int,
  output_tokens int,
  called_at timestamptz not null default now()
);
create index ai_model_calls_user_idx on public.ai_model_calls (user_id, called_at);
create index ai_model_calls_client_idx on public.ai_model_calls (client_key, called_at);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.notification_categories enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.email_outbox enable row level security;
alter table public.support_tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.ticket_events enable row level security;
alter table public.invoices enable row level security;
alter table public.refund_accounts enable row level security;
alter table public.ai_threads enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_model_calls enable row level security;

grant select on public.notification_categories to anon, authenticated;
grant select, update, delete on public.notifications to authenticated;
grant select, insert, update, delete on public.notification_preferences to authenticated;
grant select, update on public.email_outbox to authenticated;
grant select, insert, update on public.support_tickets, public.ticket_messages to authenticated;
grant select, insert on public.ticket_events to authenticated;
grant select on public.invoices, public.refund_accounts, public.ai_model_calls to authenticated;
grant select, insert, update, delete on public.ai_threads to authenticated;
grant select, insert on public.ai_messages to authenticated;
-- Customers can mark their notifications read, nothing else.
revoke update on public.notifications from authenticated;
grant update (is_read, read_at) on public.notifications to authenticated;
revoke all on public.notifications, public.notification_preferences, public.email_outbox, public.support_tickets,
  public.ticket_messages, public.ticket_events, public.invoices, public.refund_accounts, public.ai_threads,
  public.ai_messages, public.ai_model_calls from anon;

create policy notification_categories_read on public.notification_categories for select to anon, authenticated using (true);

create policy notifications_own on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_mark_read on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete_own on public.notifications for delete to authenticated using (user_id = auth.uid());

create policy notification_preferences_own on public.notification_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy email_outbox_admin on public.email_outbox for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Tickets: owner sees own tickets and non-internal messages; staff see all.
create policy support_tickets_select on public.support_tickets for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy support_tickets_admin on public.support_tickets for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy ticket_messages_select on public.ticket_messages for select to authenticated
  using (public.is_admin() or (not is_internal and exists (
    select 1 from public.support_tickets t where t.id = ticket_messages.ticket_id and t.user_id = auth.uid())));
create policy ticket_messages_admin_insert on public.ticket_messages for insert to authenticated
  with check (public.is_admin() and author_kind = 'staff' and author_id = auth.uid());
create policy ticket_events_admin on public.ticket_events for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy invoices_select on public.invoices for select to authenticated
  using (public.is_admin() or user_id = auth.uid());
create policy refund_accounts_admin on public.refund_accounts for select to authenticated using (public.is_admin());

create policy ai_threads_own on public.ai_threads for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ai_messages_own on public.ai_messages for select to authenticated
  using (exists (select 1 from public.ai_threads t where t.id = ai_messages.thread_id and t.user_id = auth.uid()));
create policy ai_messages_insert_own on public.ai_messages for insert to authenticated
  with check (exists (select 1 from public.ai_threads t where t.id = ai_messages.thread_id and t.user_id = auth.uid()));
create policy ai_model_calls_admin on public.ai_model_calls for select to authenticated using (public.is_admin());
