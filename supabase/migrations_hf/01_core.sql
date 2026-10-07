-- HF F1: extensions, profiles, vehicles
create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "unaccent" with schema extensions;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.f_unaccent(text)
returns text language sql immutable parallel safe as $$
  select extensions.unaccent($1)
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  role text not null default 'customer'
    check (role in ('customer', 'administrador', 'gerente', 'operador', 'estoque', 'atendimento')),
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('administrador', 'gerente', 'operador', 'estoque', 'atendimento')
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'phone',
    nullif(new.raw_user_meta_data->>'username', ''),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.protect_profile_role()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    if not public.is_staff() then
      raise exception 'role_change_forbidden';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.manufacturers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create table public.models (
  id uuid primary key default gen_random_uuid(),
  manufacturer_id uuid not null references public.manufacturers (id) on delete cascade,
  name text not null,
  slug text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  unique (manufacturer_id, slug)
);

create table public.vehicle_versions (
  id uuid primary key default gen_random_uuid(),
  manufacturer_id uuid not null references public.manufacturers (id) on delete cascade,
  model_id uuid not null references public.models (id) on delete cascade,
  year int,
  engine text,
  version_name text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create index vehicle_versions_filter_idx
  on public.vehicle_versions (manufacturer_id, model_id, year, engine);
