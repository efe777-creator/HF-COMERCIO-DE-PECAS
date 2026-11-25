-- HF Andar 1: cotações e leads (incl. seja parceiro).
-- REVERSAO: drop table lead_items; drop table leads;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'quote'
    check (kind in ('quote', 'partner', 'contact')),
  status text not null default 'new'
    check (status in ('new', 'in_progress', 'won', 'lost', 'spam')),
  contact_name text not null,
  contact_email text,
  contact_phone text,
  company_name text,
  document text,
  city text,
  state text,
  message text,
  staff_notes text,
  vehicle_snapshot jsonb,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_kind_status_idx on public.leads (kind, status, created_at desc);

create table if not exists public.lead_items (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  sku_snapshot text,
  name_snapshot text,
  quantity numeric(12, 3) not null default 1 check (quantity > 0),
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists lead_items_lead_idx on public.lead_items (lead_id, sort_order);

comment on table public.leads is
  'Lead/cotação persistente (Andar 1) — anon pode inserir; staff gerencia.';
comment on table public.lead_items is
  'Itens de cotação vinculados ao lead (produto opcional + snapshot).';

alter table public.leads enable row level security;
alter table public.lead_items enable row level security;

drop policy if exists leads_anon_insert on public.leads;
create policy leads_anon_insert on public.leads
  for insert to anon, authenticated
  with check (true);

drop policy if exists leads_staff_select on public.leads;
create policy leads_staff_select on public.leads
  for select to authenticated
  using (public.is_staff());

drop policy if exists leads_staff_update on public.leads;
create policy leads_staff_update on public.leads
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists lead_items_anon_insert on public.lead_items;
create policy lead_items_anon_insert on public.lead_items
  for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.leads l
      where l.id = lead_id
    )
  );

drop policy if exists lead_items_staff_select on public.lead_items;
create policy lead_items_staff_select on public.lead_items
  for select to authenticated
  using (public.is_staff());

drop policy if exists lead_items_staff_update on public.lead_items;
create policy lead_items_staff_update on public.lead_items
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

grant insert on public.leads to anon, authenticated;
grant select, update on public.leads to authenticated;
grant insert on public.lead_items to anon, authenticated;
grant select, update on public.lead_items to authenticated;