-- HF F1: B2B customers, groups, catalogs
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

create or replace function public.current_customer_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select cu.customer_id
  from public.customer_users cu
  where cu.profile_id = auth.uid()
    and cu.status = 'active';
$$;

create or replace function public.customer_can_see_product(p_product_id uuid)
returns boolean
language plpgsql stable security definer set search_path = public
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
language plpgsql stable security definer set search_path = public
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
