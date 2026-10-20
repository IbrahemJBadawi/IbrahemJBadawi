-- =====================================================================
-- Jamal Platform — core schema
-- Compatible with Supabase (Postgres 15+). Money columns use numeric(12,3)
-- so currencies with 3 decimals (KWD, BHD, OMR, JOD) are representable.
-- No currency conversion happens anywhere in the database.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text check (char_length(full_name) <= 120),
  phone text check (char_length(phone) <= 32),
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile automatically for every new auth user.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Is the current request made by an admin? SECURITY DEFINER so it can read
-- profiles regardless of the caller's RLS visibility.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
$$;

-- ---------------------------------------------------------------------
-- Currencies, countries, shipping zones
-- ---------------------------------------------------------------------
create table public.currencies (
  code char(3) primary key check (code = upper(code)),
  name_ar text not null,
  name_en text not null,
  symbol text not null,
  decimals smallint not null default 2 check (decimals between 0 and 3),
  is_active boolean not null default false
);

create table public.countries (
  code char(2) primary key check (code = upper(code)),
  name_ar text not null,
  name_en text not null,
  default_currency char(3) references public.currencies (code),
  is_active boolean not null default false,
  sort_order int not null default 0
);

create table public.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references public.countries (code) on delete cascade,
  currency_code char(3) not null references public.currencies (code),
  name_ar text not null,
  rate numeric(12,3) not null default 0 check (rate >= 0),
  free_shipping_threshold numeric(12,3) check (free_shipping_threshold is null or free_shipping_threshold > 0),
  min_days int not null default 3 check (min_days >= 0),
  max_days int not null default 10 check (max_days >= min_days),
  cod_available boolean not null default false,
  is_active boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (country_code, currency_code)
);
create trigger shipping_zones_updated_at before update on public.shipping_zones
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_ar text not null,
  name_en text,
  description_ar text,
  image_url text,
  parent_id uuid references public.categories (id) on delete set null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_ar text not null,
  name_en text,
  description_ar text,
  description_en text,
  category_id uuid references public.categories (id) on delete set null,
  price numeric(12,3) not null check (price >= 0),
  sale_price numeric(12,3) check (sale_price is null or (sale_price >= 0 and sale_price < price)),
  currency_code char(3) not null references public.currencies (code),
  -- [{ "url": "...", "alt": "..." }]
  images jsonb not null default '[]'::jsonb check (jsonb_typeof(images) = 'array'),
  availability text not null default 'available'
    check (availability in ('available', 'out_of_stock', 'discontinued')),
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  -- Only set when verified with the supplier.
  origin_country text,
  return_policy text,
  -- Per-country delivery estimate overrides: { "SA": { "min": 5, "max": 9 } }
  delivery_overrides jsonb not null default '{}'::jsonb check (jsonb_typeof(delivery_overrides) = 'object'),
  is_featured boolean not null default false,
  -- Demo/sample products are clearly labelled in the UI and orders containing
  -- them are flagged as test orders (excluded from sales figures).
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products (category_id);
create index products_status_idx on public.products (status);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  color_name text,
  color_hex text check (color_hex is null or color_hex ~ '^#[0-9a-fA-F]{6}$'),
  size text,
  sku text,
  price_override numeric(12,3) check (price_override is null or price_override >= 0),
  availability text not null default 'available'
    check (availability in ('available', 'out_of_stock', 'discontinued')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique nulls not distinct (product_id, color_name, size)
);
create index product_variants_product_idx on public.product_variants (product_id);

-- ---------------------------------------------------------------------
-- Suppliers (internal — never exposed to customers)
-- ---------------------------------------------------------------------
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  email text,
  phone text,
  whatsapp text,
  website text,
  country_code char(2),
  -- ISO country codes the supplier ships to / offers cash-on-delivery in.
  ships_to text[] not null default '{}',
  cod_countries text[] not null default '{}',
  processing_days int not null default 2 check (processing_days >= 0),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger suppliers_updated_at before update on public.suppliers
  for each row execute function public.set_updated_at();

create table public.supplier_products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete cascade,
  supplier_sku text,
  supplier_url text,
  cost numeric(12,3) not null check (cost >= 0),
  shipping_cost numeric(12,3) not null default 0 check (shipping_cost >= 0),
  currency_code char(3) not null references public.currencies (code),
  is_primary boolean not null default true,
  notes text,
  updated_at timestamptz not null default now(),
  unique nulls not distinct (supplier_id, product_id, variant_id)
);
create unique index supplier_products_one_primary
  on public.supplier_products (product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where is_primary;
create trigger supplier_products_updated_at before update on public.supplier_products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Customer data
-- ---------------------------------------------------------------------
create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ---------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references auth.users (id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  country_code char(2) not null references public.countries (code),
  city text not null,
  address_line text not null,
  customer_notes text,
  currency_code char(3) not null references public.currencies (code),
  subtotal numeric(12,3) not null check (subtotal >= 0),
  shipping_cost numeric(12,3) not null check (shipping_cost >= 0),
  discount_total numeric(12,3) not null default 0 check (discount_total >= 0),
  total numeric(12,3) not null check (total >= 0),
  payment_method text not null check (payment_method in ('cod', 'manual')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'refunded', 'partially_refunded')),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')),
  shipping_zone_id uuid references public.shipping_zones (id) on delete set null,
  estimated_min_days int,
  estimated_max_days int,
  terms_accepted_at timestamptz not null,
  is_test boolean not null default false,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id);
create index orders_status_idx on public.orders (status);
create index orders_created_idx on public.orders (created_at desc);
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_name text not null,
  product_slug text,
  variant_label text,
  sku text,
  image_url text,
  unit_price numeric(12,3) not null check (unit_price >= 0),
  quantity int not null check (quantity between 1 and 20),
  line_total numeric(12,3) not null check (line_total >= 0)
);
create index order_items_order_idx on public.order_items (order_id);

-- Fulfillment: one record per supplier per order. Sent to the supplier
-- manually by an admin in the MVP (no automated supplier integration).
create table public.fulfillment_records (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  supplier_id uuid references public.suppliers (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'sent_to_supplier', 'confirmed', 'shipped', 'delivered', 'cancelled', 'failed')),
  supplier_order_ref text,
  carrier text,
  tracking_number text,
  tracking_url text,
  cost_currency char(3) references public.currencies (code),
  expected_cost numeric(12,3),
  actual_cost numeric(12,3) check (actual_cost is null or actual_cost >= 0),
  actual_shipping_cost numeric(12,3) check (actual_shipping_cost is null or actual_shipping_cost >= 0),
  notes text,
  sent_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index fulfillment_order_idx on public.fulfillment_records (order_id);
create trigger fulfillment_updated_at before update on public.fulfillment_records
  for each row execute function public.set_updated_at();

-- Internal cost snapshot per order line (admin only, kept apart from
-- order_items so customers can never read supplier costs).
create table public.order_item_costs (
  order_item_id uuid primary key references public.order_items (id) on delete cascade,
  fulfillment_id uuid references public.fulfillment_records (id) on delete set null,
  supplier_id uuid references public.suppliers (id) on delete set null,
  supplier_sku text,
  supplier_url text,
  unit_cost numeric(12,3),
  unit_shipping_cost numeric(12,3),
  cost_currency char(3) references public.currencies (code)
);

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status text,
  note text,
  visible_to_customer boolean not null default true,
  actor_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);

create table public.return_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  reason text not null check (char_length(reason) between 5 and 2000),
  status text not null default 'requested'
    check (status in ('requested', 'approved', 'rejected', 'received', 'refunded')),
  refund_amount numeric(12,3) check (refund_amount is null or refund_amount >= 0),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index return_requests_order_idx on public.return_requests (order_id);
create trigger return_requests_updated_at before update on public.return_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Store content & settings
-- ---------------------------------------------------------------------
create table public.store_settings (
  id smallint primary key default 1 check (id = 1),
  store_name_ar text not null default 'منصة الجمال',
  store_name_en text not null default 'JAMAL',
  tagline_ar text,
  announcement_ar text,
  contact_email text,
  contact_phone text,
  whatsapp text,
  default_currency char(3) references public.currencies (code),
  -- Global switch. COD is also gated per shipping zone and per supplier.
  cod_enabled boolean not null default false,
  manual_orders_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
create trigger store_settings_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();

create table public.pages (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title_ar text not null,
  body_ar text not null default '',
  is_published boolean not null default true,
  updated_at timestamptz not null default now()
);
create trigger pages_updated_at before update on public.pages
  for each row execute function public.set_updated_at();

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  subject text,
  message text not null,
  user_id uuid references auth.users (id) on delete set null,
  status text not null default 'new' check (status in ('new', 'in_progress', 'closed')),
  created_at timestamptz not null default now()
);

-- Append-only audit trail of important admin operations.
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
