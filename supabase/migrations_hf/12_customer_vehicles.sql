-- HF Andar 1 / P0: customer_vehicles (garagem da conta)
-- Alinha migrations_hf ao customerVehicleService + AccountVehiclesPage.
-- Não copiar Garage rica de referência.

create table if not exists public.customer_vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  manufacturer_id uuid references public.manufacturers (id) on delete set null,
  model_id uuid references public.models (id) on delete set null,
  version_id uuid references public.vehicle_versions (id) on delete set null,
  year int,
  engine text,
  nickname text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists customer_vehicles_customer_idx
  on public.customer_vehicles (customer_id);

create unique index if not exists customer_vehicles_one_primary_idx
  on public.customer_vehicles (customer_id)
  where is_primary = true;

alter table public.customer_vehicles enable row level security;

drop policy if exists cvehicles_select_own on public.customer_vehicles;
drop policy if exists cvehicles_insert_own on public.customer_vehicles;
drop policy if exists cvehicles_update_own on public.customer_vehicles;
drop policy if exists cvehicles_delete_own on public.customer_vehicles;
drop policy if exists cvehicles_all_own on public.customer_vehicles;

-- Cliente vê/edita só os próprios; staff vê todos
create policy cvehicles_select_own on public.customer_vehicles
  for select to authenticated
  using (
    customer_id in (select public.current_customer_ids())
    or public.is_staff()
  );

create policy cvehicles_insert_own on public.customer_vehicles
  for insert to authenticated
  with check (
    customer_id in (select public.current_customer_ids())
    or public.is_staff()
  );

create policy cvehicles_update_own on public.customer_vehicles
  for update to authenticated
  using (
    customer_id in (select public.current_customer_ids())
    or public.is_staff()
  )
  with check (
    customer_id in (select public.current_customer_ids())
    or public.is_staff()
  );

create policy cvehicles_delete_own on public.customer_vehicles
  for delete to authenticated
  using (
    customer_id in (select public.current_customer_ids())
    or public.is_staff()
  );

grant select, insert, update, delete on public.customer_vehicles to authenticated;

comment on table public.customer_vehicles is
  'HF Andar 1 P0: veículos salvos na conta do cliente B2B (garagem seed).';
