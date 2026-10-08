-- HF: alinhar imports/import_items ao shape do app + custos + listas de preço (sem order_items).
-- RPCs apply_* ficam em migrations subsequentes / 06b.

-- ---------------------------------------------------------------------------
-- imports: filename, report, supplier_id, price_list_id, kinds/status amplos
-- ---------------------------------------------------------------------------
alter table public.imports add column if not exists filename text;
alter table public.imports add column if not exists report jsonb;
alter table public.imports add column if not exists supplier_id uuid references public.suppliers (id) on delete set null;
alter table public.imports add column if not exists price_list_id uuid;

update public.imports
set filename = coalesce(nullif(filename, ''), file_name, 'import')
where filename is null or filename = '';

update public.imports
set report = coalesce(report, summary, '{}'::jsonb)
where report is null;

alter table public.imports alter column filename set default 'import';
update public.imports set filename = 'import' where filename is null;
alter table public.imports alter column filename set not null;

alter table public.imports drop constraint if exists imports_kind_check;
alter table public.imports
  add constraint imports_kind_check check (
    kind in (
      'catalog', 'catalog_products', 'catalog_applications', 'applications',
      'supplier_conversion', 'supplier_cost', 'price_list',
      'customers', 'codes', 'prices', 'other', 'generic'
    )
  );

alter table public.imports drop constraint if exists imports_status_check;
alter table public.imports
  add constraint imports_status_check check (
    status in (
      'pending', 'uploaded', 'preview', 'validated', 'importing',
      'done', 'applied', 'failed', 'cancelled'
    )
  );

create index if not exists imports_supplier_id_idx
  on public.imports (supplier_id) where supplier_id is not null;

-- ---------------------------------------------------------------------------
-- import_items: line_number, errors, warnings, result
-- ---------------------------------------------------------------------------
alter table public.import_items add column if not exists line_number int;
alter table public.import_items add column if not exists errors text[];
alter table public.import_items add column if not exists warnings text[];
alter table public.import_items add column if not exists result text;

update public.import_items
set line_number = coalesce(line_number, row_number)
where line_number is null;

update public.import_items
set result = coalesce(result, status)
where result is null;

-- ---------------------------------------------------------------------------
-- supplier_products.cost + unique parcial (supplier_id, supplier_sku)
-- ---------------------------------------------------------------------------
alter table public.supplier_products
  add column if not exists cost numeric(12, 2);

create unique index if not exists supplier_products_supplier_sku_uidx
  on public.supplier_products (supplier_id, supplier_sku)
  where supplier_sku is not null;

-- ---------------------------------------------------------------------------
-- price_lists / items / history (admin interno; vitrine B2B permanece sem preço)
-- ---------------------------------------------------------------------------
create table if not exists public.price_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'inactive')),
  scope text not null default 'public'
    check (scope in ('public', 'assigned')),
  priority int not null default 0,
  valid_from timestamptz,
  valid_until timestamptz,
  is_default boolean not null default false,
  list_extra_cost numeric(12, 2) not null default 0 check (list_extra_cost >= 0),
  pricing_method text not null default 'fixed'
    check (pricing_method in ('margin_on_sell', 'markup_on_cost', 'fixed')),
  pricing_percent numeric(8, 4) not null default 0,
  rounding_mode text not null default 'two_decimals'
    check (rounding_mode in ('two_decimals')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists price_lists_one_default_uidx
  on public.price_lists (is_default)
  where is_default = true;

create table if not exists public.price_list_items (
  id uuid primary key default gen_random_uuid(),
  price_list_id uuid not null references public.price_lists (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  price numeric(12, 2) not null check (price >= 0),
  extra_cost numeric(12, 2) not null default 0 check (extra_cost >= 0),
  price_origin text not null default 'manual'
    check (price_origin in ('calculated', 'imported', 'manual')),
  calculated_price numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (price_list_id, product_id)
);

create index if not exists price_list_items_product_idx
  on public.price_list_items (product_id);

create table if not exists public.price_change_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  price_list_id uuid not null references public.price_lists (id) on delete cascade,
  old_price numeric(12, 2),
  new_price numeric(12, 2) not null,
  changed_by uuid references auth.users (id) on delete set null,
  source text not null
    check (source in ('manual', 'import', 'system', 'override', 'bulk_adjust', 'recalculate')),
  import_id uuid references public.imports (id) on delete set null,
  created_at timestamptz not null default now()
);

-- FK price_list_id em imports (após tabela existir)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'imports_price_list_id_fkey'
  ) then
    alter table public.imports
      add constraint imports_price_list_id_fkey
      foreign key (price_list_id) references public.price_lists (id) on delete set null;
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists price_lists_updated_at on public.price_lists;
create trigger price_lists_updated_at
  before update on public.price_lists
  for each row execute function public.set_updated_at();

drop trigger if exists price_list_items_updated_at on public.price_list_items;
create trigger price_list_items_updated_at
  before update on public.price_list_items
  for each row execute function public.set_updated_at();

alter table public.price_lists enable row level security;
alter table public.price_list_items enable row level security;
alter table public.price_change_history enable row level security;

drop policy if exists price_lists_public_read on public.price_lists;
create policy price_lists_public_read on public.price_lists
  for select using (scope = 'public' and status = 'active');

drop policy if exists price_lists_staff_select on public.price_lists;
create policy price_lists_staff_select on public.price_lists
  for select to authenticated using (public.is_staff());

drop policy if exists price_lists_staff_insert on public.price_lists;
create policy price_lists_staff_insert on public.price_lists
  for insert to authenticated with check (public.is_staff());

drop policy if exists price_lists_staff_update on public.price_lists;
create policy price_lists_staff_update on public.price_lists
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists price_lists_staff_delete on public.price_lists;
create policy price_lists_staff_delete on public.price_lists
  for delete to authenticated using (public.is_staff());

drop policy if exists price_list_items_public_read on public.price_list_items;
create policy price_list_items_public_read on public.price_list_items
  for select using (
    exists (
      select 1 from public.price_lists pl
      where pl.id = price_list_id
        and pl.scope = 'public'
        and pl.status = 'active'
    )
  );

drop policy if exists price_list_items_staff_select on public.price_list_items;
create policy price_list_items_staff_select on public.price_list_items
  for select to authenticated using (public.is_staff());

drop policy if exists price_list_items_staff_insert on public.price_list_items;
create policy price_list_items_staff_insert on public.price_list_items
  for insert to authenticated with check (public.is_staff());

drop policy if exists price_list_items_staff_update on public.price_list_items;
create policy price_list_items_staff_update on public.price_list_items
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists price_list_items_staff_delete on public.price_list_items;
create policy price_list_items_staff_delete on public.price_list_items
  for delete to authenticated using (public.is_staff());

drop policy if exists price_change_history_staff_select on public.price_change_history;
create policy price_change_history_staff_select on public.price_change_history
  for select to authenticated using (public.is_staff());

drop policy if exists price_change_history_staff_insert on public.price_change_history;
create policy price_change_history_staff_insert on public.price_change_history
  for insert to authenticated with check (public.is_staff());

grant select on public.price_lists to anon, authenticated;
grant select on public.price_list_items to anon, authenticated;
grant select on public.price_change_history to authenticated;
grant insert, update, delete on public.price_lists to authenticated;
grant insert, update, delete on public.price_list_items to authenticated;
grant insert on public.price_change_history to authenticated;

insert into public.price_lists (id, name, slug, description, status, scope, priority, is_default)
values
  ('a1111111-1111-1111-1111-111111111101', 'Preço Base', 'preco-base',
   'Lista padrão / fallback comercial (admin HF)', 'active', 'public', 0, true),
  ('a1111111-1111-1111-1111-111111111102', 'Lista Promocional', 'promocional',
   'Preços promocionais (admin; vitrine B2B sem preço público)', 'active', 'public', 100, false)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  status = excluded.status,
  scope = excluded.scope,
  priority = excluded.priority,
  is_default = excluded.is_default;

-- ---------------------------------------------------------------------------
-- Seed fornecedor principal HF-SUP-01
-- ---------------------------------------------------------------------------
insert into public.suppliers (id, name, code, status)
values (
  'b2222222-2222-2222-2222-222222222001',
  'Fornecedor HF Principal',
  'HF-SUP-01',
  'active'
)
on conflict (code) do update set
  name = excluded.name,
  status = 'active';

-- ---------------------------------------------------------------------------
-- Helpers import
-- ---------------------------------------------------------------------------
create or replace function public.staff_can_import_catalog()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('administrador', 'gerente')
  );
$$;

revoke all on function public.staff_can_import_catalog() from public;
grant execute on function public.staff_can_import_catalog() to authenticated;

create or replace function public.slug_from_sku(p_sku text)
returns text
language plpgsql
immutable
as $$
declare
  v text;
begin
  v := lower(trim(both from coalesce(p_sku, '')));
  v := regexp_replace(v, '[^a-z0-9]+', '-', 'g');
  v := regexp_replace(v, '^-+|-+$', '', 'g');
  if v is null or v = '' then
    v := 'sku';
  end if;
  return left(v, 80);
end;
$$;

create or replace function public.slug_from_name(p_name text)
returns text
language plpgsql
immutable
as $$
declare
  v text;
begin
  v := lower(trim(both from coalesce(p_name, '')));
  v := regexp_replace(v, '[^a-z0-9]+', '-', 'g');
  v := regexp_replace(v, '^-+|-+$', '', 'g');
  if v is null or v = '' then
    v := 'item';
  end if;
  return left(v, 80);
end;
$$;

create or replace function public._validate_product_posicao(p text)
returns boolean
language sql
immutable
as $$
  select p is null
    or p ~ '^(DIANTEIRA|TRASEIRA|SUPERIOR|INFERIOR)(_(DIANTEIRA|TRASEIRA|SUPERIOR|INFERIOR)){0,3}$';
$$;

-- Stub: formação de preço completa fica fora do MVP B2B; custo import não quebra.
create or replace function public.recalculate_calculated_for_products(p_product_ids uuid[])
returns jsonb
language sql
stable
as $$
  select jsonb_build_object('recalculated', 0, 'skipped', coalesce(cardinality(p_product_ids), 0));
$$;

revoke all on function public.recalculate_calculated_for_products(uuid[]) from public;
grant execute on function public.recalculate_calculated_for_products(uuid[]) to authenticated;
