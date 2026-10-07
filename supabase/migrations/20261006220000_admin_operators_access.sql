-- Controle de acesso admin: busca usuários + set role (só administrador).
-- Cadastro continua customer; promote via RPC / tela Operadores.

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() null = service_role / migration (permite seed)
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_administrador() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_profile_role() from public, anon, authenticated;

create or replace function public.admin_search_users(p_query text)
returns table (
  id uuid,
  email text,
  full_name text,
  username text,
  role text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_q text := nullif(trim(coalesce(p_query, '')), '');
begin
  if auth.uid() is null or not public.is_administrador() then
    raise exception 'Somente administrador' using errcode = '42501';
  end if;

  if v_q is null then
    return;
  end if;

  return query
  select
    p.id,
    u.email::text,
    p.full_name,
    p.username,
    p.role,
    p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where
    u.email ilike '%' || v_q || '%'
    or coalesce(p.full_name, '') ilike '%' || v_q || '%'
    or coalesce(p.username, '') ilike '%' || v_q || '%'
  order by u.email
  limit 50;
end;
$$;

create or replace function public.admin_set_user_role(p_user_id uuid, p_role text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.profiles;
  v_old_role text;
  v_admin_count int;
begin
  if auth.uid() is null or not public.is_administrador() then
    raise exception 'Somente administrador' using errcode = '42501';
  end if;

  if p_user_id is null then
    raise exception 'Usuario invalido' using errcode = '22023';
  end if;

  if p_role is null or p_role not in (
    'customer', 'administrador', 'gerente', 'operador', 'estoque', 'atendimento'
  ) then
    raise exception 'Role invalida' using errcode = '22023';
  end if;

  select role into v_old_role from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Usuario nao encontrado' using errcode = 'P0002';
  end if;

  if v_old_role = 'administrador' and p_role is distinct from 'administrador' then
    select count(*)::int into v_admin_count
    from public.profiles
    where role = 'administrador';

    if v_admin_count <= 1 then
      raise exception 'Nao pode remover o ultimo administrador' using errcode = 'P0001';
    end if;
  end if;

  update public.profiles
  set role = p_role
  where id = p_user_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.admin_search_users(text) from public;
revoke all on function public.admin_set_user_role(uuid, text) from public;
grant execute on function public.admin_search_users(text) to authenticated;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

-- Seed: promove lucas se a conta Auth já existir
update public.profiles p
set role = 'administrador'
from auth.users u
where p.id = u.id
  and lower(u.email) = 'lucasfeliciober@gmail.com';
