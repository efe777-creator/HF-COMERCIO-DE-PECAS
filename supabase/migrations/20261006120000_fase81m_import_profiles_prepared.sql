-- F8.1-M PREPARED (NÃO APLICAR sem autorização — sem db push neste gate)
-- Perfis de importação reutilizáveis (mapeamento de colunas).
-- Até apply remoto, a UI usa localStorage (importProfiles.ts).

create table if not exists public.import_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('price_list', 'catalog', 'supplier_conversion', 'supplier_cost')),
  headers_fingerprint text[] not null default '{}',
  mapping jsonb not null default '{}'::jsonb,
  options jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, name)
);

alter table public.import_profiles enable row level security;

drop policy if exists import_profiles_staff_select on public.import_profiles;
create policy import_profiles_staff_select on public.import_profiles
  for select to authenticated using (public.is_staff());

drop policy if exists import_profiles_staff_write on public.import_profiles;
create policy import_profiles_staff_write on public.import_profiles
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

grant select, insert, update, delete on public.import_profiles to authenticated;

comment on table public.import_profiles is
  'F8.1-M: perfis de mapeamento de importação. Migration preparada; UI usa localStorage até db push autorizado.';
