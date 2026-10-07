-- Bloco C/D: operadores (lista staff + último acesso) + exclusão de conta (soft).

-- 1) Soft-delete / desativação de perfil
alter table public.profiles
  add column if not exists deleted_at timestamptz,
  add column if not exists deactivated_at timestamptz;

comment on column public.profiles.deleted_at is
  'Conta encerrada pelo cliente; histórico comercial preservado via customers/orders.';
comment on column public.profiles.deactivated_at is
  'Operador desativado pelo admin (preferível a excluir).';

-- 2) Busca: query vazia lista staff; inclui last_sign_in_at
-- Retorno ampliado → drop da assinatura antiga
drop function if exists public.admin_search_users(text);

create or replace function public.admin_search_users(p_query text)
returns table (
  id uuid,
  email text,
  full_name text,
  username text,
  role text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  deactivated_at timestamptz
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

  -- Sem busca: lista operadores (não clientes)
  if v_q is null then
    return query
    select
      p.id,
      u.email::text,
      p.full_name,
      p.username,
      p.role,
      p.created_at,
      u.last_sign_in_at,
      p.deactivated_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.role in ('administrador', 'gerente', 'operador', 'estoque', 'atendimento')
      and p.deleted_at is null
    order by u.email
    limit 100;
    return;
  end if;

  return query
  select
    p.id,
    u.email::text,
    p.full_name,
    p.username,
    p.role,
    p.created_at,
    u.last_sign_in_at,
    p.deactivated_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.deleted_at is null
    and (
      u.email ilike '%' || v_q || '%'
      or coalesce(p.full_name, '') ilike '%' || v_q || '%'
      or coalesce(p.username, '') ilike '%' || v_q || '%'
    )
  order by u.email
  limit 50;
end;
$$;

revoke all on function public.admin_search_users(text) from public;
grant execute on function public.admin_search_users(text) to authenticated;

-- 3) Desativar operador (soft) — role → customer + deactivated_at
create or replace function public.admin_deactivate_operator(p_user_id uuid)
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

  if p_user_id is null or p_user_id = auth.uid() then
    raise exception 'Nao e possivel desativar a si mesmo' using errcode = '22023';
  end if;

  select role into v_old_role from public.profiles where id = p_user_id and deleted_at is null;
  if not found then
    raise exception 'Usuario nao encontrado' using errcode = 'P0002';
  end if;

  if v_old_role = 'administrador' then
    select count(*)::int into v_admin_count
    from public.profiles
    where role = 'administrador' and deleted_at is null and deactivated_at is null;
    if v_admin_count <= 1 then
      raise exception 'Nao pode desativar o ultimo administrador' using errcode = 'P0001';
    end if;
  end if;

  update public.profiles
  set role = 'customer',
      deactivated_at = now()
  where id = p_user_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.admin_deactivate_operator(uuid) from public;
grant execute on function public.admin_deactivate_operator(uuid) to authenticated;

-- 4) Cliente solicita exclusão de conta (preserva pedidos/customers)
create or replace function public.request_account_deletion()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Nao autenticado' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.profiles
    where id = v_uid and role in ('administrador', 'gerente', 'operador', 'estoque', 'atendimento')
      and deactivated_at is null
  ) then
    raise exception 'Contas da equipe nao podem ser excluidas por este fluxo' using errcode = 'P0001';
  end if;

  update public.profiles
  set
    full_name = 'Conta encerrada',
    phone = null,
    username = null,
    role = 'customer',
    deleted_at = coalesce(deleted_at, now()),
    updated_at = now()
  where id = v_uid;

  -- Limpa documentos no customer, mantém id para histórico de pedidos
  update public.customers
  set cpf = null, cnpj = null
  where profile_id = v_uid;
end;
$$;

revoke all on function public.request_account_deletion() from public;
grant execute on function public.request_account_deletion() to authenticated;

-- 5) import_profiles.kind — permitir catalog_applications (se a tabela existir)
do $$
declare
  r record;
begin
  if to_regclass('public.import_profiles') is null then
    return;
  end if;

  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'import_profiles'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%kind%'
  loop
    execute format('alter table public.import_profiles drop constraint %I', r.conname);
  end loop;

  alter table public.import_profiles
    add constraint import_profiles_kind_check
    check (kind in (
      'price_list', 'catalog', 'catalog_applications',
      'supplier_conversion', 'supplier_cost'
    ));
end $$;
