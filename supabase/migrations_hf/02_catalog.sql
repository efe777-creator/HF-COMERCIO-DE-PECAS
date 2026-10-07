-- HF F1: catalog tables
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
  logo_path text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  cnpj text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  slug text not null unique,
  description text,
  short_description text,
  brand_id uuid references public.product_brands (id) on delete set null,
  category_id uuid references public.product_categories (id) on delete set null,
  supplier_id uuid references public.suppliers (id) on delete set null,
  price numeric(12, 2) not null default 0 check (price >= 0),
  promo_price numeric(12, 2) check (promo_price is null or promo_price >= 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  manufacturer_code text,
  posicao text,
  lado text,
  attrs jsonb not null default '{}'::jsonb,
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
create index products_sku_idx on public.products (sku);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

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
    check (ref_type in ('manufacturer', 'oem', 'internal', 'competitor', 'supplier', 'other')),
  brand_label text,
  created_at timestamptz not null default now(),
  unique (product_id, code, ref_type)
);

create index product_references_code_idx on public.product_references (code);

create table public.product_vehicle_compatibility (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  vehicle_version_id uuid not null references public.vehicle_versions (id) on delete cascade,
  year_start int,
  year_end int,
  notes text,
  created_at timestamptz not null default now(),
  unique (product_id, vehicle_version_id)
);

create index pvc_product_idx on public.product_vehicle_compatibility (product_id);

create table public.supplier_products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  supplier_sku text not null,
  created_at timestamptz not null default now(),
  unique (supplier_id, supplier_sku),
  unique (supplier_id, product_id)
);

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'catalog'
    check (kind in ('catalog', 'applications', 'customers', 'codes', 'prices', 'other')),
  status text not null default 'pending'
    check (status in ('pending', 'preview', 'validated', 'applied', 'failed', 'cancelled')),
  file_name text,
  created_by uuid references public.profiles (id) on delete set null,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.import_items (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.imports (id) on delete cascade,
  row_number int,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'ok', 'error', 'skipped')),
  error_message text,
  created_at timestamptz not null default now()
);

create table public.import_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'catalog',
  mapping jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
