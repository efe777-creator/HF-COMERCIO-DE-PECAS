-- Fase 5: segurança de role + veículo principal do cliente.
-- Incremental; não recria tabelas.

-- Impede self-promote: cliente não altera profiles.role
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_staff() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row
  execute function public.protect_profile_role();

revoke all on function public.protect_profile_role() from public, anon, authenticated;

-- Veículo principal do cliente
alter table public.customer_vehicles
  add column if not exists is_primary boolean not null default false;

create unique index if not exists customer_vehicles_one_primary_idx
  on public.customer_vehicles (customer_id)
  where is_primary = true;

-- Fallback: cliente pode criar a própria linha customers se o trigger não tiver corrido
drop policy if exists customers_insert_own on public.customers;
create policy customers_insert_own on public.customers
  for insert
  with check (profile_id = auth.uid() or public.is_staff());

