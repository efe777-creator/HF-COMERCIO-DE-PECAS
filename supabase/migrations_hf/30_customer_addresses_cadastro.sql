-- HF: cadastro estruturado clientes — endereço + fiscal leve + snapshot CNPJ
-- Sem crédito / territórios / QSA.

alter table public.customers
  add column if not exists contact_name text,
  add column if not exists state_registration text,
  add column if not exists ie_indicator text
    check (ie_indicator is null or ie_indicator in ('icms', 'exempt', 'non_contributor')),
  add column if not exists cnpj_status text,
  add column if not exists cnpj_checked_at timestamptz,
  add column if not exists cnae_code text;

-- Um CNPJ (só dígitos) por cliente quando informado
create unique index if not exists customers_cnpj_digits_unique
  on public.customers ((regexp_replace(coalesce(cnpj, ''), '\D', '', 'g')))
  where cnpj is not null and regexp_replace(cnpj, '\D', '', 'g') <> '';

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  kind text not null default 'principal'
    check (kind in ('principal', 'entrega', 'operacional')),
  postal_code text,
  street text,
  street_number text,
  complement text,
  district text,
  city text,
  state text,
  ibge_code text,
  macro_region text,
  country text not null default 'BR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_addresses_customer_idx
  on public.customer_addresses (customer_id);

create index if not exists customer_addresses_state_idx
  on public.customer_addresses (state)
  where state is not null;

-- No máximo 1 endereço principal por cliente
create unique index if not exists customer_addresses_one_principal
  on public.customer_addresses (customer_id)
  where kind = 'principal';

drop trigger if exists customer_addresses_set_updated_at on public.customer_addresses;
create trigger customer_addresses_set_updated_at
  before update on public.customer_addresses
  for each row execute function public.set_updated_at();

alter table public.customer_addresses enable row level security;

drop policy if exists customer_addresses_staff_all on public.customer_addresses;
create policy customer_addresses_staff_all on public.customer_addresses
  for all
  using (public.is_staff())
  with check (public.is_staff());

-- Cliente autenticado lê só o endereço do próprio customer (portal futuro)
drop policy if exists customer_addresses_self_read on public.customer_addresses;
create policy customer_addresses_self_read on public.customer_addresses
  for select
  using (
    exists (
      select 1
      from public.customer_users cu
      where cu.customer_id = customer_addresses.customer_id
        and cu.profile_id = auth.uid()
        and cu.status = 'active'
    )
  );
