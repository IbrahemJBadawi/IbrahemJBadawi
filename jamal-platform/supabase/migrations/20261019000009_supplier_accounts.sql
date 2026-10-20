-- =====================================================================
-- Supplier accounts: a third role next to customers and the admin.
-- A supplier signs up, applies with their business details, and submits
-- products. The admin reviews the supplier and every product, sets the
-- customer price and publishes. Suppliers never see other suppliers' data,
-- customer prices are the admin's decision, and nothing is published by a
-- supplier directly.
-- =====================================================================

-- 1. Roles
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('customer', 'supplier', 'admin'));

create or replace function public.admin_set_role(target uuid, new_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if new_role not in ('customer', 'supplier', 'admin') then
    raise exception 'invalid role';
  end if;
  if target = auth.uid() and new_role <> 'admin' then
    raise exception 'cannot demote yourself';
  end if;
  update public.profiles set role = new_role where id = target;
end $$;

-- 2. Supplier ↔ account
alter table public.suppliers
  add column if not exists owner_user_id uuid unique references auth.users (id) on delete set null,
  add column if not exists applied_at timestamptz,
  add column if not exists governorate_id uuid references public.governorates (id) on delete set null,
  add column if not exists city text;

alter table public.suppliers drop constraint if exists suppliers_agreement_status_check;
alter table public.suppliers add constraint suppliers_agreement_status_check
  check (agreement_status in ('applied', 'contacting', 'negotiating', 'approved', 'suspended'));

-- 3. Products submitted by suppliers go through review
alter table public.products
  add column if not exists submitted_by_supplier uuid references public.suppliers (id) on delete set null,
  add column if not exists review_status text check (review_status is null or review_status in ('pending', 'changes_requested', 'approved')),
  add column if not exists review_note text,
  add column if not exists submitted_at timestamptz;
create index if not exists products_review_idx on public.products (review_status) where review_status is not null;

-- 4. Notifications for the new audience
alter table public.notification_categories add column if not exists supplier_only boolean not null default false;
insert into public.notification_categories (kind, title_ar, detail_ar, admin_only, is_mandatory, email_default, sort_order, supplier_only) values
  ('admin_supplier', 'الموردون', 'طلب انضمام مورد، أو منتج جديد من مورد بانتظار المراجعة.', true, false, true, 15, false),
  ('supplier_update', 'حساب المورد', 'قبول حسابك، ومراجعة منتجاتك، والطلبات على منتجاتك.', false, true, true, 4, true)
on conflict (kind) do nothing;

create or replace function public.trg_supplier_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.owner_user_id is not null then
    perform public.notify_admins('admin_supplier', 'طلب انضمام مورد: ' || new.name,
      coalesce(new.city, '') || ' ' || coalesce(new.categories_supplied, ''), '/admin/suppliers/' || new.id, 'supplier', new.id);
  elsif tg_op = 'UPDATE' and new.owner_user_id is not null and new.agreement_status is distinct from old.agreement_status then
    if new.agreement_status = 'approved' then
      perform public.notify(new.owner_user_id, 'supplier_update', 'تم اعتماد متجرك على متجر الجمال 🎉',
        'يمكنك الآن إضافة منتجاتك، وننشرها بعد مراجعة سريعة.', '/supplier', 'supplier', new.id);
    elsif new.agreement_status = 'suspended' then
      perform public.notify(new.owner_user_id, 'supplier_update', 'تم إيقاف حساب المورد مؤقتًا',
        'تواصل مع فريق المنصة لمعرفة التفاصيل.', '/supplier', 'supplier', new.id);
    end if;
  end if;
  return new;
end $$;
create trigger suppliers_notify after insert or update of agreement_status on public.suppliers
  for each row execute function public.trg_supplier_notify();

create or replace function public.trg_supplier_product_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare owner uuid; sname text;
begin
  if new.submitted_by_supplier is null then return new; end if;
  select owner_user_id, name into owner, sname from public.suppliers where id = new.submitted_by_supplier;
  if new.review_status = 'pending' and (tg_op = 'INSERT' or old.review_status is distinct from 'pending') then
    perform public.notify_admins('admin_supplier', 'منتج للمراجعة من ' || sname, new.name_ar, '/admin/products/' || new.id, 'product', new.id);
  elsif tg_op = 'UPDATE' and owner is not null then
    if new.review_status = 'changes_requested' and old.review_status is distinct from 'changes_requested' then
      perform public.notify(owner, 'supplier_update', 'مطلوب تعديل على منتجك: ' || new.name_ar,
        coalesce(new.review_note, 'راجع ملاحظات الفريق.'), '/supplier/products/' || new.id, 'product', new.id);
    elsif new.status = 'published' and old.status is distinct from 'published' then
      perform public.notify(owner, 'supplier_update', 'تم نشر منتجك: ' || new.name_ar,
        'أصبح ظاهرًا للعملاء الآن.', '/supplier/products/' || new.id, 'product', new.id);
    end if;
  end if;
  return new;
end $$;
create trigger products_supplier_notify after insert or update of review_status, status on public.products
  for each row execute function public.trg_supplier_product_notify();

-- Publishing a reviewed product closes its review.
create or replace function public.trg_product_review_done() returns trigger
language plpgsql as $$
begin
  if new.status = 'published' and old.status is distinct from 'published' and new.review_status in ('pending', 'changes_requested') then
    new.review_status := 'approved';
  end if;
  return new;
end $$;
create trigger products_review_done before update of status on public.products
  for each row execute function public.trg_product_review_done();

-- Fulfillments sent to a supplier also notify that supplier's account.
create or replace function public.trg_fulfillment_supplier_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare owner uuid; num text;
begin
  if new.status = 'sent_to_supplier' and (tg_op = 'INSERT' or old.status is distinct from 'sent_to_supplier') then
    select owner_user_id into owner from public.suppliers where id = new.supplier_id;
    select order_number into num from public.orders where id = new.order_id;
    if owner is not null then
      perform public.notify(owner, 'supplier_update', 'طلب جديد للتجهيز ' || num,
        'جهّز الطلب وأرسله للعميل حسب التفاصيل.', '/supplier/orders', 'order', new.order_id);
    end if;
  end if;
  return new;
end $$;
create trigger fulfillment_supplier_notify after insert or update of status on public.fulfillment_records
  for each row execute function public.trg_fulfillment_supplier_notify();

-- 5. Uploaded product photos kept in the database when no file storage is
-- configured (serverless hosts have no writable disk). Server-only.
create table if not exists public.media_files (
  name text primary key check (name ~ '^[0-9a-f-]{36}\.(jpg|png|webp|avif)$'),
  mime text not null,
  data bytea not null,
  created_at timestamptz not null default now()
);
alter table public.media_files enable row level security;
revoke all on public.media_files from anon, authenticated;
