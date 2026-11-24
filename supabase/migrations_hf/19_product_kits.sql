-- HF Andar 1: natureza kit + destaque na home + composição BOM (sem preço de kit).
-- REVERSAO: drop table product_kit_components;
--   alter table products drop column if exists product_kind, drop column if exists is_featured;

alter table public.products
  add column if not exists product_kind text not null default 'item',
  add column if not exists is_featured boolean not null default false;

alter table public.products
  drop constraint if exists products_product_kind_check;

alter table public.products
  add constraint products_product_kind_check
  check (product_kind in ('item', 'kit'));

create index if not exists products_product_kind_idx on public.products (product_kind);
create index if not exists products_is_featured_idx on public.products (is_featured)
  where is_featured = true and status = 'published';

comment on column public.products.product_kind is
  'Natureza comercial: item (SKU unitário) ou kit (composição BOM).';
comment on column public.products.is_featured is
  'Destaque manual na vitrine/home (complementa campanhas).';

create table if not exists public.product_kit_components (
  id uuid primary key default gen_random_uuid(),
  kit_product_id uuid not null references public.products (id) on delete cascade,
  component_product_id uuid not null references public.products (id) on delete restrict,
  quantity numeric(12, 3) not null check (quantity > 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_kit_components_no_self check (kit_product_id <> component_product_id),
  constraint product_kit_components_unique unique (kit_product_id, component_product_id)
);

create index if not exists product_kit_components_kit_idx
  on public.product_kit_components (kit_product_id, sort_order);

create index if not exists product_kit_components_component_idx
  on public.product_kit_components (component_product_id);

comment on table public.product_kit_components is
  'BOM do kit: kit_product_id → componentes + quantidade.';

create or replace function public.enforce_product_kit_component_kinds()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_kit_kind text;
  v_comp_kind text;
begin
  select product_kind into v_kit_kind from public.products where id = new.kit_product_id;
  if v_kit_kind is distinct from 'kit' then
    raise exception 'product_kit_components: kit_product_id deve ter product_kind=kit';
  end if;
  select product_kind into v_comp_kind from public.products where id = new.component_product_id;
  if v_comp_kind is distinct from 'item' then
    raise exception 'product_kit_components: componente deve ter product_kind=item';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_product_kit_component_kinds on public.product_kit_components;
create trigger trg_enforce_product_kit_component_kinds
  before insert or update on public.product_kit_components
  for each row execute function public.enforce_product_kit_component_kinds();

alter table public.product_kit_components enable row level security;

drop policy if exists product_kit_components_public_read on public.product_kit_components;
create policy product_kit_components_public_read on public.product_kit_components
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = kit_product_id
        and p.status = 'published'
        and public.customer_can_see_product(p.id)
    )
  );

drop policy if exists product_kit_components_staff_all on public.product_kit_components;
create policy product_kit_components_staff_all on public.product_kit_components
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

grant select on public.product_kit_components to anon, authenticated;
grant select, insert, update, delete on public.product_kit_components to authenticated;