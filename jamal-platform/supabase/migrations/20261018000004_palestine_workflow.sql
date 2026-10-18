-- =====================================================================
-- Al Jamal — Palestine order-to-cash workflow (additive, non-destructive)
--
-- Model: customer orders → admin confirms stock & price with the supplier →
-- admin approves the final price → customer pays by bank transfer → admin
-- verifies the money manually → admin pays the supplier (outside the
-- platform, documented here) → supplier ships directly → delivery → profit.
-- No automatic money movement, no bank or courier integration.
-- Existing rows are migrated to the new status values; nothing is deleted.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Currency & market: Israeli new shekel for Palestine
-- ---------------------------------------------------------------------
insert into public.currencies (code, name_ar, name_en, symbol, decimals, is_active)
values ('ILS', 'شيكل', 'Israeli New Shekel', '₪', 2, true)
on conflict (code) do update set is_active = true;

update public.countries set default_currency = 'ILS', is_active = true, sort_order = 0 where code = 'PS';
update public.store_settings set default_currency = 'ILS' where id = 1 and default_currency = 'USD';

-- Governorates (reference list only — no prices are invented here).
create table public.governorates (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references public.countries (code) on delete cascade,
  name_ar text not null,
  name_en text,
  sort_order int not null default 0,
  unique (country_code, name_ar)
);
insert into public.governorates (country_code, name_ar, name_en, sort_order) values
  ('PS', 'القدس', 'Jerusalem', 1),
  ('PS', 'رام الله والبيرة', 'Ramallah & Al-Bireh', 2),
  ('PS', 'نابلس', 'Nablus', 3),
  ('PS', 'الخليل', 'Hebron', 4),
  ('PS', 'بيت لحم', 'Bethlehem', 5),
  ('PS', 'جنين', 'Jenin', 6),
  ('PS', 'طولكرم', 'Tulkarm', 7),
  ('PS', 'قلقيلية', 'Qalqilya', 8),
  ('PS', 'سلفيت', 'Salfit', 9),
  ('PS', 'طوباس', 'Tubas', 10),
  ('PS', 'أريحا والأغوار', 'Jericho & Al-Aghwar', 11),
  ('PS', 'شمال غزة', 'North Gaza', 12),
  ('PS', 'غزة', 'Gaza', 13),
  ('PS', 'دير البلح', 'Deir al-Balah', 14),
  ('PS', 'خانيونس', 'Khan Yunis', 15),
  ('PS', 'رفح', 'Rafah', 16)
on conflict do nothing;

-- Shipping zones can now target one governorate (null = whole country).
alter table public.shipping_zones
  add column governorate_id uuid references public.governorates (id) on delete cascade,
  add column estimated_cost numeric(12,3) check (estimated_cost is null or estimated_cost >= 0),
  add column carrier text;
alter table public.shipping_zones drop constraint shipping_zones_country_code_currency_code_key;
create unique index shipping_zones_unique_area
  on public.shipping_zones (country_code, currency_code, coalesce(governorate_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ---------------------------------------------------------------------
-- Suppliers: agreement terms (must be confirmed by an admin, never assumed)
-- ---------------------------------------------------------------------
alter table public.suppliers
  add column agreement_status text not null default 'contacting'
    check (agreement_status in ('contacting', 'negotiating', 'approved', 'suspended')),
  add column coverage_areas text,
  add column categories_supplied text,
  add column social_links text,
  add column delivery_days int check (delivery_days is null or delivery_days >= 0),
  add column return_policy text,
  add column min_order text,
  add column accepts_single_item boolean,
  add column accepts_dropship boolean,
  add column accepts_pay_after_collection boolean,
  add column accepts_cod boolean,
  add column collection_party text check (collection_party is null or collection_party in ('platform', 'supplier', 'courier')),
  add column settlement_method text,
  add column terms_confirmed_at timestamptz,
  add column terms_confirmed_by uuid references auth.users (id) on delete set null,
  add column prices_confirmed_at timestamptz;

-- Products: manual stock/price confirmation date and preparation time.
alter table public.products
  add column stock_confirmed_at timestamptz,
  add column processing_days int check (processing_days is null or processing_days >= 0);

-- A product can only be published when its primary supplier is approved.
create or replace function public.check_product_publishable() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'published' and not exists (
    select 1 from public.supplier_products sp
    join public.suppliers s on s.id = sp.supplier_id
    where sp.product_id = new.id and sp.is_primary and s.agreement_status = 'approved'
  ) then
    raise exception 'لا يمكن نشر المنتج قبل ربطه بمورد أساسي معتمد' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger products_publishable before insert or update of status on public.products
  for each row execute function public.check_product_publishable();

-- Suspending a supplier (or moving it back from approved) hides its products.
create or replace function public.hide_products_of_unapproved_supplier() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.agreement_status = 'approved' and new.agreement_status <> 'approved' then
    update public.products p set status = 'hidden'
    where p.status = 'published' and exists (
      select 1 from public.supplier_products sp where sp.product_id = p.id and sp.supplier_id = new.id and sp.is_primary
    );
  end if;
  return new;
end $$;
create trigger suppliers_hide_products after update of agreement_status on public.suppliers
  for each row execute function public.hide_products_of_unapproved_supplier();

-- Existing (pre-workflow) published products keep working: their suppliers
-- become approved only if they were active, so nothing silently disappears.
update public.suppliers set agreement_status = 'approved' where is_active and exists (
  select 1 from public.supplier_products sp join public.products p on p.id = sp.product_id
  where sp.supplier_id = suppliers.id and p.status = 'published'
);

-- ---------------------------------------------------------------------
-- Orders: workflow status, payment status, approved price, money tracking
-- ---------------------------------------------------------------------
alter table public.orders drop constraint orders_status_check;
alter table public.orders drop constraint orders_payment_status_check;
alter table public.orders drop constraint orders_payment_method_check;

update public.orders set status = case status
  when 'pending' then 'new'
  when 'confirmed' then 'under_review'
  else status end;

alter table public.orders
  alter column status set default 'new',
  add constraint orders_status_check check (status in (
    'new', 'under_review', 'awaiting_stock', 'awaiting_payment', 'payment_review', 'paid',
    'awaiting_supplier_payout', 'supplier_paid', 'processing', 'shipped', 'delivered',
    'cancel_requested', 'cancelled', 'returned', 'refund_pending', 'refunded')),
  add constraint orders_payment_status_check check (payment_status in (
    'unpaid', 'pending_verification', 'paid', 'partially_refunded', 'refunded')),
  add constraint orders_payment_method_check check (payment_method in ('bank_transfer', 'cod', 'manual')),
  add column governorate_id uuid references public.governorates (id) on delete set null,
  add column governorate_name text,
  add column idempotency_key uuid unique,
  add column access_token text unique,
  add column fees_total numeric(12,3) not null default 0 check (fees_total >= 0),
  add column fees_label text,
  add column expected_shipping_cost numeric(12,3),
  add column price_approved_at timestamptz,
  add column price_approved_by uuid references auth.users (id) on delete set null,
  add column payment_due_at timestamptz,
  add column amount_collected numeric(12,3) not null default 0 check (amount_collected >= 0),
  add column payment_verified_at timestamptz,
  add column payment_verified_by uuid references auth.users (id) on delete set null,
  add column payment_reference text,
  add column status_before_cancel text,
  add column cancelled_by text check (cancelled_by is null or cancelled_by in ('customer', 'admin')),
  add column cancel_cost_party text check (cancel_cost_party is null or cancel_cost_party in ('customer', 'platform', 'supplier', 'none')),
  add column non_refundable_amount numeric(12,3) not null default 0 check (non_refundable_amount >= 0),
  add column status_changed_at timestamptz not null default now();

-- Per-item manual stock/price confirmation with the supplier.
alter table public.order_items
  add column stock_status text not null default 'unconfirmed'
    check (stock_status in ('unconfirmed', 'available', 'unavailable')),
  add column stock_confirmed_at timestamptz,
  add column stock_confirmed_by uuid references auth.users (id) on delete set null,
  add column stock_note text;

-- Order events record the transition and who made it.
alter table public.order_events add column from_status text;

-- ---------------------------------------------------------------------
-- Fulfillment (one per supplier per order) = shipment + supplier settlement
-- ---------------------------------------------------------------------
alter table public.fulfillment_records drop constraint fulfillment_records_status_check;
update public.fulfillment_records set status = case status
  when 'pending' then 'awaiting_supplier'
  when 'confirmed' then 'supplier_accepted'
  when 'failed' then 'delivery_failed'
  else status end;
alter table public.fulfillment_records
  alter column status set default 'awaiting_supplier',
  add constraint fulfillment_records_status_check check (status in (
    'awaiting_supplier', 'sent_to_supplier', 'supplier_accepted', 'preparing', 'shipped',
    'delivered', 'delivery_failed', 'cancelled', 'returned')),
  add column issue_reason text,
  -- Who receives the actual delivery cost: the supplier (added to what we owe
  -- them) or a courier paid directly. It is counted once as a cost either way.
  add column shipping_paid_to text not null default 'supplier'
    check (shipping_paid_to in ('supplier', 'courier', 'none')),
  add column settlement_status text not null default 'not_due'
    check (settlement_status in ('not_due', 'due', 'awaiting_transfer', 'paid', 'disputed', 'cancelled')),
  add column settlement_paid_amount numeric(12,3) check (settlement_paid_amount is null or settlement_paid_amount >= 0),
  add column settlement_paid_at timestamptz,
  add column settlement_reference text,
  add column settlement_recorded_by uuid references auth.users (id) on delete set null,
  add column settlement_notes text,
  add column supplier_refund_amount numeric(12,3) check (supplier_refund_amount is null or supplier_refund_amount >= 0),
  add column supplier_refund_status text not null default 'none'
    check (supplier_refund_status in ('none', 'pending', 'received'));

-- ---------------------------------------------------------------------
-- Bank transfer settings (admin-only table; never readable by the public).
-- Left EMPTY on purpose: the owner enters the real details.
-- ---------------------------------------------------------------------
create table public.payment_settings (
  id smallint primary key default 1 check (id = 1),
  bank_transfer_enabled boolean not null default false,
  beneficiary_name text,
  bank_name text,
  transfer_details text,
  instructions text,
  validity_hours int check (validity_hours is null or validity_hours between 1 and 720),
  proof_review_policy text,
  contact text,
  updated_at timestamptz not null default now()
);
insert into public.payment_settings (id) values (1) on conflict do nothing;
create trigger payment_settings_updated_at before update on public.payment_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Payment proofs (customer uploads; uploading never means "paid")
-- ---------------------------------------------------------------------
create table public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  declared_amount numeric(12,3) not null check (declared_amount > 0),
  currency_code char(3) not null references public.currencies (code),
  customer_reference text,
  customer_note text,
  has_file boolean not null default false,
  source text not null default 'customer' check (source in ('customer', 'admin')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  verified_amount numeric(12,3) check (verified_amount is null or verified_amount >= 0),
  verified_reference text,
  verified_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);
create index payment_proofs_order_idx on public.payment_proofs (order_id);

-- Files are stored in a separate admin-only table so they are never sent to
-- listings and stay protected by RLS (no public bucket needed).
create table public.payment_proof_files (
  proof_id uuid primary key references public.payment_proofs (id) on delete cascade,
  mime_type text not null,
  size_bytes int not null check (size_bytes > 0 and size_bytes <= 5242880),
  data bytea not null
);

-- ---------------------------------------------------------------------
-- Order expenses (fees, return costs, other) and customer refunds
-- Delivery cost lives on fulfillment_records only (never here), so it is
-- never counted twice.
-- ---------------------------------------------------------------------
create table public.order_expenses (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  kind text not null check (kind in ('payment_fee', 'transfer_fee', 'return_cost', 'other')),
  amount numeric(12,3) not null check (amount > 0),
  currency_code char(3) not null references public.currencies (code),
  note text,
  recorded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index order_expenses_order_idx on public.order_expenses (order_id);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  return_request_id uuid references public.return_requests (id) on delete set null,
  amount numeric(12,3) not null check (amount > 0),
  currency_code char(3) not null references public.currencies (code),
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  method text,
  reference text,
  completed_at timestamptz,
  recorded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index refunds_order_idx on public.refunds (order_id);
create trigger refunds_updated_at before update on public.refunds
  for each row execute function public.set_updated_at();

-- Returns: type of request and who bears the cost.
alter table public.return_requests drop constraint return_requests_status_check;
alter table public.return_requests
  add constraint return_requests_status_check check (status in ('requested', 'approved', 'rejected', 'received', 'refunded', 'exchanged', 'closed')),
  add column kind text not null default 'return' check (kind in ('return', 'exchange', 'damaged', 'wrong_item')),
  add column cost_party text check (cost_party is null or cost_party in ('customer', 'platform', 'supplier', 'none'));

-- ---------------------------------------------------------------------
-- RLS for new tables
-- ---------------------------------------------------------------------
alter table public.governorates        enable row level security;
alter table public.payment_settings    enable row level security;
alter table public.payment_proofs      enable row level security;
alter table public.payment_proof_files enable row level security;
alter table public.order_expenses      enable row level security;
alter table public.refunds             enable row level security;

grant select on public.governorates to anon, authenticated;
grant insert, update, delete on public.governorates to authenticated;
grant select, insert, update, delete on public.payment_settings, public.payment_proof_files, public.order_expenses to authenticated;
grant select, insert, update on public.payment_proofs, public.refunds to authenticated;
revoke insert, update, delete on public.governorates, public.payment_settings, public.payment_proofs,
  public.payment_proof_files, public.order_expenses, public.refunds from anon;

create policy governorates_read on public.governorates for select to anon, authenticated using (true);
create policy governorates_admin on public.governorates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy payment_settings_admin on public.payment_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Customers may read the review state of proofs on their own orders (no files);
-- they create proofs only through the server, which verifies ownership.
create policy payment_proofs_select on public.payment_proofs for select to authenticated
  using (public.is_admin() or exists (select 1 from public.orders o where o.id = payment_proofs.order_id and o.user_id = auth.uid()));
create policy payment_proofs_admin on public.payment_proofs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy payment_proof_files_admin on public.payment_proof_files for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy order_expenses_admin on public.order_expenses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy refunds_select on public.refunds for select to authenticated
  using (public.is_admin() or exists (select 1 from public.orders o where o.id = refunds.order_id and o.user_id = auth.uid()));
create policy refunds_admin on public.refunds for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Admins confirm stock/price per order line (customers still cannot update lines).
grant update on public.order_items to authenticated;
create policy order_items_admin_update on public.order_items for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Customers can still never update orders (status, payment) directly:
-- orders_admin_update from the previous migration remains the only UPDATE policy.

-- ---------------------------------------------------------------------
-- Policies text for the Palestinian bank-transfer model
-- ---------------------------------------------------------------------
update public.pages set body_ar =
'## كيف يتم الطلب والدفع؟
1. ترسل طلبك عبر المنصة دون أي دفع.
2. نتواصل مع المورد لتأكيد توفر المقاس واللون والسعر وتكلفة التوصيل لمنطقتك.
3. نعتمد السعر النهائي ويظهر لك في صفحة الطلب مع تعليمات التحويل البنكي.
4. تحوّل المبلغ وترفع صورة إثبات التحويل.
5. نتحقق يدويًا من وصول المبلغ فعليًا إلى الحساب، ثم نبدأ تجهيز الطلب.

## كيف أتابع طلبي؟
من صفحة «طلباتي» في حسابك، أو من رابط الطلب الخاص الذي يظهر بعد الطلب، أو من صفحة «تتبع الطلب» برقم الطلب ورقم الهاتف.

## هل رفع صورة التحويل يعني أن الدفع تم؟
لا. يُعتبر الطلب مدفوعًا فقط بعد أن نتحقق من وصول المبلغ إلى الحساب ونؤكد ذلك في صفحة الطلب.

## كم تستغرق مدة التوصيل؟
تظهر المدة التقديرية لمحافظتك عند الطلب، ونؤكدها لك عند اعتماد السعر.

## هل يمكنني إلغاء طلبي؟
قبل الدفع يمكنك الإلغاء مباشرة من صفحة الطلب. بعد الدفع يمكنك تقديم طلب إلغاء ونراجعه وفق سياسة الإرجاع.

## كيف أطلب إرجاع أو استبدال منتج؟
بعد التسليم يظهر زر «طلب إرجاع أو استبدال» في صفحة الطلب، وتطبق سياسة الإرجاع الخاصة بالمنتج.'
where slug = 'faq';

update public.pages set body_ar =
'## نطاق التوصيل
نوصل حاليًا إلى المحافظات والمناطق المفعّلة فقط والظاهرة عند الطلب. إذا لم تظهر منطقتك فهذا يعني أن التوصيل إليها غير متاح حاليًا.

## رسوم ومدة التوصيل
رسوم التوصيل تُضاف إلى إجمالي الطلب وتظهر لك بوضوح قبل التحويل. المدة تقديرية وتبدأ بعد تأكيد الدفع، وقد تتأثر بالظروف الميدانية والإغلاقات.

## الشحن
يجهّز المورد طلبك ويشحنه مباشرة إليك عبر شركة توصيل، ونضيف اسم شركة التوصيل ورقم التتبع في صفحة طلبك متى توفّر.

## فشل التوصيل
إذا تعذّر التسليم نتواصل معك لإعادة المحاولة أو لإلغاء الطلب، وتُحدد مسؤولية رسوم التوصيل وفق السبب وسياسة الإرجاع.'
where slug = 'shipping';
