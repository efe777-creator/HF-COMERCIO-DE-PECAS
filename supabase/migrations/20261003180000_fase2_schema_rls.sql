-- FAL Peças 3.0 — Fase 2: schema + RLS
-- Spec: docs/planejamento/ESPECIFICACAO_FASE2_ARQUITETURA_DADOS.md

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles + customers
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  role text not null default 'customer'
    check (role in ('customer', 'administrador', 'gerente', 'operador', 'estoque', 'atendimento')),
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  cpf text,
  cnpj text,
  created_at timestamptz not null default now()
);

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  label text,
  recipient text not null,
  street text not null,
  number text not null,
  complement text,
  district text,
  city text not null,
  state text not null,
  postal_code text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.customer_vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  manufacturer_id uuid,
  model_id uuid,
  year int,
  engine text,
  version_id uuid,
  nickname text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Vehicles
-- ---------------------------------------------------------------------------
create table public.manufacturers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create table public.models (
  id uuid primary key default gen_random_uuid(),
  manufacturer_id uuid not null references public.manufacturers (id) on delete cascade,
  name text not null,
  slug text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  unique (manufacturer_id, slug)
);

create table public.vehicle_versions (
  id uuid primary key default gen_random_uuid(),
  manufacturer_id uuid not null references public.manufacturers (id) on delete cascade,
  model_id uuid not null references public.models (id) on delete cascade,
  year int,
  engine text,
  version_name text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create index vehicle_versions_filter_idx
  on public.vehicle_versions (manufacturer_id, model_id, year, engine);

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.product_categories (id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  sort_order int not null default 0,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now()
);

create table public.product_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  slug text not null unique,
  description text,
  brand_id uuid references public.product_brands (id) on delete set null,
  category_id uuid references public.product_categories (id) on delete set null,
  price numeric(12, 2) not null check (price >= 0),
  promo_price numeric(12, 2) check (promo_price is null or promo_price >= 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  manufacturer_code text,
  search_document text,
  seo_title text,
  seo_description text,
  is_incomplete boolean not null default false,
  is_available boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_status_idx on public.products (status);
create index products_category_idx on public.products (category_id);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  alt text,
  sort_order int not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.product_references (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  code text not null,
  ref_type text not null default 'manufacturer'
    check (ref_type in ('manufacturer', 'oem', 'internal', 'competitor', 'other')),
  brand_label text,
  created_at timestamptz not null default now(),
  unique (product_id, code, ref_type)
);

create index product_references_code_idx on public.product_references (code);

create table public.product_vehicle_compatibility (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  vehicle_version_id uuid not null references public.vehicle_versions (id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  unique (product_id, vehicle_version_id)
);

create index pvc_product_idx on public.product_vehicle_compatibility (product_id);
create index pvc_version_idx on public.product_vehicle_compatibility (vehicle_version_id);

-- ---------------------------------------------------------------------------
-- Inventory
-- ---------------------------------------------------------------------------
create table public.inventory (
  product_id uuid primary key references public.products (id) on delete cascade,
  quantity_on_hand int not null default 0 check (quantity_on_hand >= 0),
  quantity_reserved int not null default 0 check (quantity_reserved >= 0),
  updated_at timestamptz not null default now()
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  type text not null check (type in ('in', 'out', 'adjust', 'reserve', 'release')),
  quantity int not null,
  reason text,
  order_id uuid,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Loja: disponibilidade espelhada em products (sem expor quantidade)
create or replace function public.sync_product_availability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
  set is_available = (coalesce(new.quantity_on_hand, 0) - coalesce(new.quantity_reserved, 0)) > 0
  where id = new.product_id;
  return new;
end;
$$;

create trigger inventory_sync_availability
  after insert or update on public.inventory
  for each row execute function public.sync_product_availability();

-- ---------------------------------------------------------------------------
-- Cart / favorites / orders
-- ---------------------------------------------------------------------------
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique references public.customers (id) on delete cascade,
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity int not null check (quantity > 0),
  unit_price_snapshot numeric(12, 2),
  unique (cart_id, product_id)
);

create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete restrict,
  status text not null default 'pendente'
    check (status in (
      'pendente',
      'aguardando_pagamento',
      'pagamento_aprovado',
      'em_separacao',
      'preparando_envio',
      'enviado',
      'entregue',
      'cancelado'
    )),
  subtotal numeric(12, 2) not null default 0,
  shipping_amount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  address_snapshot jsonb,
  payment_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  sku text not null,
  name_snapshot text not null,
  unit_price numeric(12, 2) not null,
  quantity int not null check (quantity > 0)
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status text not null,
  note text,
  changed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.inventory_movements
  add constraint inventory_movements_order_fk
  foreign key (order_id) references public.orders (id) on delete set null;

alter table public.customer_vehicles
  add constraint customer_vehicles_manufacturer_fk
  foreign key (manufacturer_id) references public.manufacturers (id) on delete set null;

alter table public.customer_vehicles
  add constraint customer_vehicles_model_fk
  foreign key (model_id) references public.models (id) on delete set null;

alter table public.customer_vehicles
  add constraint customer_vehicles_version_fk
  foreign key (version_id) references public.vehicle_versions (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Suppliers / imports / placeholders
-- ---------------------------------------------------------------------------
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create table public.supplier_products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  supplier_sku text,
  cost numeric(12, 2),
  unique (supplier_id, product_id)
);

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  status text not null default 'uploaded'
    check (status in ('uploaded', 'validated', 'preview', 'importing', 'done', 'failed')),
  created_by uuid references auth.users (id) on delete set null,
  report jsonb,
  created_at timestamptz not null default now()
);

create table public.import_items (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.imports (id) on delete cascade,
  line_number int,
  errors text[],
  warnings text[],
  payload jsonb,
  result text,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text,
  status text not null default 'pending',
  amount numeric(12, 2),
  external_ref text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text,
  status text not null default 'pending',
  tracking_code text,
  amount numeric(12, 2),
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Auth trigger: profile + customer
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name, phone, role)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'username', ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    'customer'
  )
  on conflict (id) do nothing;

  insert into public.customers (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create trigger inventory_updated_at
  before update on public.inventory
  for each row execute function public.set_updated_at();

create trigger carts_updated_at
  before update on public.carts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers (após tabelas)
-- ---------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('administrador', 'gerente', 'operador', 'estoque', 'atendimento')
  );
$$;

create or replace function public.current_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.customers c
  where c.profile_id = auth.uid()
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.customer_vehicles enable row level security;
alter table public.manufacturers enable row level security;
alter table public.models enable row level security;
alter table public.vehicle_versions enable row level security;
alter table public.product_categories enable row level security;
alter table public.product_brands enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_references enable row level security;
alter table public.product_vehicle_compatibility enable row level security;
alter table public.inventory enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.favorites enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.suppliers enable row level security;
alter table public.supplier_products enable row level security;
alter table public.imports enable row level security;
alter table public.import_items enable row level security;
alter table public.payments enable row level security;
alter table public.shipments enable row level security;

-- Profiles
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid() or public.is_staff());
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid() or public.is_staff());

-- Customers
create policy customers_select_own on public.customers
  for select using (profile_id = auth.uid() or public.is_staff());
create policy customers_update_own on public.customers
  for update using (profile_id = auth.uid() or public.is_staff());

-- Addresses / vehicles
create policy addresses_all_own on public.customer_addresses
  for all using (
    customer_id = public.current_customer_id() or public.is_staff()
  )
  with check (
    customer_id = public.current_customer_id() or public.is_staff()
  );

create policy cvehicles_all_own on public.customer_vehicles
  for all using (
    customer_id = public.current_customer_id() or public.is_staff()
  )
  with check (
    customer_id = public.current_customer_id() or public.is_staff()
  );

-- Public catalog reads
create policy manufacturers_public_read on public.manufacturers
  for select using (status = 'active' or public.is_staff());
create policy models_public_read on public.models
  for select using (status = 'active' or public.is_staff());
create policy vehicle_versions_public_read on public.vehicle_versions
  for select using (status = 'active' or public.is_staff());
create policy categories_public_read on public.product_categories
  for select using (status = 'published' or public.is_staff());
create policy brands_public_read on public.product_brands
  for select using (status = 'active' or public.is_staff());
create policy products_public_read on public.products
  for select using (status = 'published' or public.is_staff());

create policy product_images_public_read on public.product_images
  for select using (
    public.is_staff()
    or exists (
      select 1 from public.products p
      where p.id = product_id and p.status = 'published'
    )
  );

create policy product_references_public_read on public.product_references
  for select using (
    public.is_staff()
    or exists (
      select 1 from public.products p
      where p.id = product_id and p.status = 'published'
    )
  );

create policy pvc_public_read on public.product_vehicle_compatibility
  for select using (
    public.is_staff()
    or exists (
      select 1 from public.products p
      where p.id = product_id and p.status = 'published'
    )
  );

-- Inventory: staff only (loja usa view product_availability)
create policy inventory_staff on public.inventory
  for all using (public.is_staff()) with check (public.is_staff());
create policy inventory_movements_staff on public.inventory_movements
  for all using (public.is_staff()) with check (public.is_staff());

-- Cart
create policy carts_own on public.carts
  for all using (
    customer_id = public.current_customer_id() or public.is_staff()
  )
  with check (
    customer_id = public.current_customer_id() or public.is_staff()
  );

create policy cart_items_own on public.cart_items
  for all using (
    exists (
      select 1 from public.carts c
      where c.id = cart_id
        and (c.customer_id = public.current_customer_id() or public.is_staff())
    )
  )
  with check (
    exists (
      select 1 from public.carts c
      where c.id = cart_id
        and (c.customer_id = public.current_customer_id() or public.is_staff())
    )
  );

-- Favorites
create policy favorites_own on public.favorites
  for all using (user_id = auth.uid() or public.is_staff())
  with check (user_id = auth.uid() or public.is_staff());

-- Orders
create policy orders_select_own on public.orders
  for select using (
    customer_id = public.current_customer_id() or public.is_staff()
  );
create policy orders_insert_own on public.orders
  for insert with check (
    customer_id = public.current_customer_id() or public.is_staff()
  );
create policy orders_update_staff on public.orders
  for update using (public.is_staff()) with check (public.is_staff());

create policy order_items_select_own on public.order_items
  for select using (
    public.is_staff()
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = public.current_customer_id()
    )
  );

create policy order_status_history_select_own on public.order_status_history
  for select using (
    public.is_staff()
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = public.current_customer_id()
    )
  );

-- Staff write for catalog / ops
create policy manufacturers_staff_write on public.manufacturers
  for all using (public.is_staff()) with check (public.is_staff());
create policy models_staff_write on public.models
  for all using (public.is_staff()) with check (public.is_staff());
create policy vehicle_versions_staff_write on public.vehicle_versions
  for all using (public.is_staff()) with check (public.is_staff());
create policy categories_staff_write on public.product_categories
  for all using (public.is_staff()) with check (public.is_staff());
create policy brands_staff_write on public.product_brands
  for all using (public.is_staff()) with check (public.is_staff());
create policy products_staff_write on public.products
  for all using (public.is_staff()) with check (public.is_staff());
create policy product_images_staff_write on public.product_images
  for all using (public.is_staff()) with check (public.is_staff());
create policy product_references_staff_write on public.product_references
  for all using (public.is_staff()) with check (public.is_staff());
create policy pvc_staff_write on public.product_vehicle_compatibility
  for all using (public.is_staff()) with check (public.is_staff());

create policy suppliers_staff on public.suppliers
  for all using (public.is_staff()) with check (public.is_staff());
create policy supplier_products_staff on public.supplier_products
  for all using (public.is_staff()) with check (public.is_staff());
create policy imports_staff on public.imports
  for all using (public.is_staff()) with check (public.is_staff());
create policy import_items_staff on public.import_items
  for all using (public.is_staff()) with check (public.is_staff());

create policy payments_select_own on public.payments
  for select using (
    public.is_staff()
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = public.current_customer_id()
    )
  );
create policy shipments_select_own on public.shipments
  for select using (
    public.is_staff()
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = public.current_customer_id()
    )
  );
create policy payments_staff_write on public.payments
  for all using (public.is_staff()) with check (public.is_staff());
create policy shipments_staff_write on public.shipments
  for all using (public.is_staff()) with check (public.is_staff());

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on public.profiles to authenticated;
grant insert, update, delete on public.customers to authenticated;
grant insert, update, delete on public.customer_addresses to authenticated;
grant insert, update, delete on public.customer_vehicles to authenticated;
grant insert, update, delete on public.carts to authenticated;
grant insert, update, delete on public.cart_items to authenticated;
grant insert, update, delete on public.favorites to authenticated;
grant insert on public.orders to authenticated;
grant insert on public.order_items to authenticated;
