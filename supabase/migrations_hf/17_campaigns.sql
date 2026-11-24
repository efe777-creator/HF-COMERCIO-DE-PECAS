-- HF Andar 1: campanhas comerciais (vitrine) — sem preço promocional no escopo.
-- REVERSAO: drop table campaign_products; drop table campaigns;

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  body text,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_date_window_chk check (
    starts_at is null or ends_at is null or starts_at <= ends_at
  )
);

create index if not exists campaigns_status_dates_idx
  on public.campaigns (status, starts_at, ends_at);

create table if not exists public.campaign_products (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (campaign_id, product_id)
);

create index if not exists campaign_products_campaign_idx
  on public.campaign_products (campaign_id, sort_order);

comment on table public.campaigns is
  'Campanhas de destaque na vitrine (sem alteração de preço no Andar 1).';
comment on table public.campaign_products is
  'Produtos vinculados a uma campanha (ordem na vitrine).';

alter table public.campaigns enable row level security;
alter table public.campaign_products enable row level security;

drop policy if exists campaigns_staff_all on public.campaigns;
create policy campaigns_staff_all on public.campaigns
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists campaigns_anon_active_select on public.campaigns;
create policy campaigns_anon_active_select on public.campaigns
  for select to anon, authenticated
  using (
    status = 'active'
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

drop policy if exists campaign_products_staff_all on public.campaign_products;
create policy campaign_products_staff_all on public.campaign_products
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists campaign_products_public_active_select on public.campaign_products;
create policy campaign_products_public_active_select on public.campaign_products
  for select to anon, authenticated
  using (
  exists (
    select 1 from public.campaigns c
    where c.id = campaign_id
      and c.status = 'active'
      and (c.starts_at is null or c.starts_at <= now())
      and (c.ends_at is null or c.ends_at >= now())
  )
  and exists (
    select 1 from public.products p
    where p.id = product_id
      and p.status = 'published'
  )
);

grant select on public.campaigns to anon, authenticated;
grant select, insert, update, delete on public.campaigns to authenticated;
grant select on public.campaign_products to anon, authenticated;
grant select, insert, update, delete on public.campaign_products to authenticated;