-- HF Comércio de Peças — FASE 1 Foundation (catálogo + B2B)
-- Sem carts/orders/payments/shipping/MP. Preço/estoque não governam publicação.

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "unaccent" with schema extensions;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.f_unaccent(text)
returns text language sql immutable parallel safe as $$
  select extensions.unaccent($1)
$$;

-- ---------------------------------------------------------------------------
-- Profiles / staff
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

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('administrador', 'gerente', 'operador', 'estoque', 'atendimento')
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'phone',
    nullif(new.raw_user_meta_data->>'username', ''),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    if not public.is_staff() then
      raise exception 'role_change_forbidden';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

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
  -- preço legado/compatível; NÃO governa publicação (price_enabled=false no app)
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
  -- legado; NÃO usar como publicação/estoque/comercial
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

-- ---------------------------------------------------------------------------
-- Imports
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- B2B: groups, customers, catalogs
-- ---------------------------------------------------------------------------
create table public.customer_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  description text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  trade_name text,
  cnpj text,
  email text,
  phone text,
  whatsapp text,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'suspended', 'inactive')),
  group_id uuid references public.customer_groups (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_status_idx on public.customers (status);
create index customers_cnpj_idx on public.customers (cnpj);

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- vínculo user ↔ empresa (N usuários por cliente)
create table public.customer_users (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  is_primary boolean not null default false,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  unique (customer_id, profile_id)
);

create index customer_users_profile_idx on public.customer_users (profile_id);

create table public.catalogs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  description text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.catalog_products (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (catalog_id, product_id)
);

create index catalog_products_product_idx on public.catalog_products (product_id);

create table public.customer_group_catalogs (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.customer_groups (id) on delete cascade,
  catalog_id uuid not null references public.catalogs (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (group_id, catalog_id)
);

create table public.customer_catalogs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  catalog_id uuid not null references public.catalogs (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (customer_id, catalog_id)
);

-- ---------------------------------------------------------------------------
-- Helpers B2B
-- ---------------------------------------------------------------------------
create or replace function public.current_customer_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select cu.customer_id
  from public.customer_users cu
  where cu.profile_id = auth.uid()
    and cu.status = 'active';
$$;

create or replace function public.customer_can_see_product(p_product_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if public.is_staff() then
    return true;
  end if;

  select status into v_status from public.products where id = p_product_id;
  if v_status is distinct from 'published' then
    return false;
  end if;

  -- cliente ACTIVE com catálogo próprio OU catálogo do grupo
  return exists (
    select 1
    from public.customer_users cu
    join public.customers c on c.id = cu.customer_id
    where cu.profile_id = auth.uid()
      and cu.status = 'active'
      and c.status = 'active'
      and (
        exists (
          select 1
          from public.customer_catalogs cc
          join public.catalog_products cp on cp.catalog_id = cc.catalog_id
          join public.catalogs cat on cat.id = cc.catalog_id
          where cc.customer_id = c.id
            and cp.product_id = p_product_id
            and cat.status = 'active'
        )
        or (
          c.group_id is not null
          and exists (
            select 1
            from public.customer_group_catalogs cgc
            join public.catalog_products cp on cp.catalog_id = cgc.catalog_id
            join public.catalogs cat on cat.id = cgc.catalog_id
            where cgc.group_id = c.group_id
              and cp.product_id = p_product_id
              and cat.status = 'active'
          )
        )
      )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Search (publicado + visível B2B; staff vê drafts no admin via queries próprias)
-- ---------------------------------------------------------------------------
create or replace function public.search_products(
  p_query text default null,
  p_limit int default 24,
  p_offset int default 0
)
returns table (
  id uuid,
  sku text,
  name text,
  slug text,
  status text,
  brand_id uuid,
  category_id uuid,
  rank real
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  q text := nullif(trim(coalesce(p_query, '')), '');
  q_norm text;
begin
  q_norm := case when q is null then null else lower(public.f_unaccent(q)) end;

  return query
  select
    p.id, p.sku, p.name, p.slug, p.status, p.brand_id, p.category_id,
    case
      when q_norm is null then 0::real
      when lower(public.f_unaccent(p.sku)) = replace(q_norm, ' ', '') then 100::real
      when lower(public.f_unaccent(p.sku)) like '%' || replace(q_norm, ' ', '') || '%' then 80::real
      when lower(public.f_unaccent(p.name)) like '%' || q_norm || '%' then 60::real
      else 10::real
    end as rank
  from public.products p
  where p.status = 'published'
    and public.customer_can_see_product(p.id)
    and (
      q_norm is null
      or lower(public.f_unaccent(p.sku)) like '%' || replace(q_norm, ' ', '') || '%'
      or lower(public.f_unaccent(p.name)) like '%' || q_norm || '%'
      or lower(public.f_unaccent(coalesce(p.search_document, ''))) like '%' || q_norm || '%'
      or exists (
        select 1 from public.product_references pr
        where pr.product_id = p.id
          and lower(public.f_unaccent(pr.code)) like '%' || replace(q_norm, ' ', '') || '%'
      )
    )
  order by rank desc, p.name asc
  limit greatest(1, least(coalesce(p_limit, 24), 100))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.manufacturers enable row level security;
alter table public.models enable row level security;
alter table public.vehicle_versions enable row level security;
alter table public.product_categories enable row level security;
alter table public.product_brands enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_references enable row level security;
alter table public.product_vehicle_compatibility enable row level security;
alter table public.supplier_products enable row level security;
alter table public.imports enable row level security;
alter table public.import_items enable row level security;
alter table public.import_profiles enable row level security;
alter table public.customer_groups enable row level security;
alter table public.customers enable row level security;
alter table public.customer_users enable row level security;
alter table public.catalogs enable row level security;
alter table public.catalog_products enable row level security;
alter table public.customer_group_catalogs enable row level security;
alter table public.customer_catalogs enable row level security;

-- profiles
create policy profiles_select_own_or_staff on public.profiles
  for select using (id = auth.uid() or public.is_staff());
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid() or public.is_staff());

-- taxonomia: leitura autenticada (B2B); staff write
create policy manufacturers_select_auth on public.manufacturers
  for select to authenticated using (true);
create policy manufacturers_write_staff on public.manufacturers
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy models_select_auth on public.models
  for select to authenticated using (true);
create policy models_write_staff on public.models
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy vehicle_versions_select_auth on public.vehicle_versions
  for select to authenticated using (true);
create policy vehicle_versions_write_staff on public.vehicle_versions
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy categories_select_auth on public.product_categories
  for select to authenticated using (status = 'published' or public.is_staff());
create policy categories_write_staff on public.product_categories
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy brands_select_auth on public.product_brands
  for select to authenticated using (status = 'active' or public.is_staff());
create policy brands_write_staff on public.product_brands
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy suppliers_staff on public.suppliers
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- products: staff all; customer only if visibility engine says yes
create policy products_select_visible on public.products
  for select to authenticated
  using (public.is_staff() or public.customer_can_see_product(id));
create policy products_write_staff on public.products
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy product_images_select on public.product_images
  for select to authenticated
  using (public.is_staff() or public.customer_can_see_product(product_id));
create policy product_images_write_staff on public.product_images
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy product_references_select on public.product_references
  for select to authenticated
  using (public.is_staff() or public.customer_can_see_product(product_id));
create policy product_references_write_staff on public.product_references
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy pvc_select on public.product_vehicle_compatibility
  for select to authenticated
  using (public.is_staff() or public.customer_can_see_product(product_id));
create policy pvc_write_staff on public.product_vehicle_compatibility
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy supplier_products_staff on public.supplier_products
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy imports_staff on public.imports
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy import_items_staff on public.import_items
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy import_profiles_staff on public.import_profiles
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- B2B admin vs self
create policy customer_groups_staff on public.customer_groups
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy customers_select on public.customers
  for select to authenticated
  using (
    public.is_staff()
    or id in (select public.current_customer_ids())
  );
create policy customers_write_staff on public.customers
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy customer_users_select on public.customer_users
  for select to authenticated
  using (public.is_staff() or profile_id = auth.uid());
create policy customer_users_write_staff on public.customer_users
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy catalogs_select on public.catalogs
  for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.customer_catalogs cc
      where cc.catalog_id = catalogs.id
        and cc.customer_id in (select public.current_customer_ids())
    )
    or exists (
      select 1
      from public.customers c
      join public.customer_group_catalogs cgc on cgc.group_id = c.group_id
      where c.id in (select public.current_customer_ids())
        and cgc.catalog_id = catalogs.id
    )
  );
create policy catalogs_write_staff on public.catalogs
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy catalog_products_select on public.catalog_products
  for select to authenticated
  using (
    public.is_staff()
    or public.customer_can_see_product(product_id)
  );
create policy catalog_products_write_staff on public.catalog_products
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy customer_group_catalogs_staff on public.customer_group_catalogs
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy customer_catalogs_select on public.customer_catalogs
  for select to authenticated
  using (
    public.is_staff()
    or customer_id in (select public.current_customer_ids())
  );
create policy customer_catalogs_write_staff on public.customer_catalogs
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

grant usage on schema public to anon, authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.customer_can_see_product(uuid) to authenticated;
grant execute on function public.current_customer_ids() to authenticated;
grant execute on function public.search_products(text, int, int) to authenticated;
