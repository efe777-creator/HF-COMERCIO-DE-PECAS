-- Fase 6C — endereços (reference), peso/dims produto, origem loja

alter table public.customer_addresses
  add column if not exists reference text;

alter table public.products
  add column if not exists weight_kg numeric(10, 3) check (weight_kg is null or weight_kg >= 0);

alter table public.products
  add column if not exists height_cm numeric(10, 2) check (height_cm is null or height_cm >= 0);

alter table public.products
  add column if not exists width_cm numeric(10, 2) check (width_cm is null or width_cm >= 0);

alter table public.products
  add column if not exists length_cm numeric(10, 2) check (length_cm is null or length_cm >= 0);

create table if not exists public.store_shipping_origin (
  id uuid primary key default gen_random_uuid(),
  postal_code text not null,
  street text not null,
  number text not null,
  complement text,
  district text,
  city text not null,
  state text not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- no máximo uma origem ativa (única linha prática)
create unique index if not exists store_shipping_origin_singleton
  on public.store_shipping_origin ((true));

alter table public.store_shipping_origin enable row level security;

drop policy if exists store_shipping_origin_staff_select on public.store_shipping_origin;
create policy store_shipping_origin_staff_select on public.store_shipping_origin
  for select to authenticated using (public.is_staff());

drop policy if exists store_shipping_origin_staff_write on public.store_shipping_origin;
create policy store_shipping_origin_staff_insert on public.store_shipping_origin
  for insert to authenticated with check (public.is_staff());

drop policy if exists store_shipping_origin_staff_update on public.store_shipping_origin;
create policy store_shipping_origin_staff_update on public.store_shipping_origin
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists store_shipping_origin_staff_delete on public.store_shipping_origin;
create policy store_shipping_origin_staff_delete on public.store_shipping_origin
  for delete to authenticated using (public.is_staff());

-- leitura autenticada para cotação (cliente precisa do CEP origem)
drop policy if exists store_shipping_origin_auth_read on public.store_shipping_origin;
create policy store_shipping_origin_auth_read on public.store_shipping_origin
  for select to authenticated using (true);

grant select on public.store_shipping_origin to authenticated;
grant insert, update, delete on public.store_shipping_origin to authenticated;

insert into public.store_shipping_origin (postal_code, street, number, district, city, state)
select '01310100', 'Av. Paulista', '1000', 'Bela Vista', 'São Paulo', 'SP'
where not exists (select 1 from public.store_shipping_origin);
