-- Fase 6B.1 — Preço avulso (exceção) + hierarquia no resolve

-- ---------------------------------------------------------------------------
-- Histórico: permitir override sem price_list_id + source override
-- ---------------------------------------------------------------------------
alter table public.price_change_history
  alter column price_list_id drop not null;

alter table public.price_change_history
  drop constraint if exists price_change_history_source_check;

alter table public.price_change_history
  add constraint price_change_history_source_check
  check (source in ('manual', 'import', 'system', 'override'));

-- ---------------------------------------------------------------------------
-- product_price_overrides
-- ---------------------------------------------------------------------------
create table if not exists public.product_price_overrides (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  note text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  valid_from timestamptz,
  valid_until timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists product_price_overrides_one_active_uidx
  on public.product_price_overrides (product_id)
  where status = 'active';

create index if not exists product_price_overrides_product_idx
  on public.product_price_overrides (product_id);

drop trigger if exists product_price_overrides_updated_at on public.product_price_overrides;
create trigger product_price_overrides_updated_at
  before update on public.product_price_overrides
  for each row execute function public.set_updated_at();

alter table public.product_price_overrides enable row level security;

drop policy if exists product_price_overrides_staff_select on public.product_price_overrides;
create policy product_price_overrides_staff_select on public.product_price_overrides
  for select to authenticated using (public.is_staff());

drop policy if exists product_price_overrides_staff_insert on public.product_price_overrides;
create policy product_price_overrides_staff_insert on public.product_price_overrides
  for insert to authenticated with check (public.is_staff());

drop policy if exists product_price_overrides_staff_update on public.product_price_overrides;
create policy product_price_overrides_staff_update on public.product_price_overrides
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists product_price_overrides_staff_delete on public.product_price_overrides;
create policy product_price_overrides_staff_delete on public.product_price_overrides
  for delete to authenticated using (public.is_staff());

grant select, insert, update, delete on public.product_price_overrides to authenticated;

-- ---------------------------------------------------------------------------
-- resolve_product_price (+ used_override)
-- ---------------------------------------------------------------------------
drop function if exists public.resolve_product_prices(uuid[], uuid, timestamptz);
drop function if exists public.resolve_product_price(uuid, uuid, timestamptz);

create or replace function public.resolve_product_price(
  p_product_id uuid,
  p_customer_id uuid default null,
  p_at timestamptz default now()
)
returns table (
  product_id uuid,
  amount numeric,
  price_list_id uuid,
  price_list_slug text,
  used_override boolean,
  used_default_fallback boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_at timestamptz := coalesce(p_at, now());
  v_row record;
  v_ov_amount numeric;
begin
  -- 0) Preço avulso válido
  select o.amount into v_ov_amount
  from public.product_price_overrides o
  where o.product_id = p_product_id
    and o.status = 'active'
    and (o.valid_from is null or o.valid_from <= v_at)
    and (o.valid_until is null or o.valid_until >= v_at)
  order by o.updated_at desc
  limit 1;

  if found then
    product_id := p_product_id;
    amount := v_ov_amount;
    price_list_id := null;
    price_list_slug := 'override';
    used_override := true;
    used_default_fallback := false;
    return next;
    return;
  end if;

  -- 1) Lista public elegível (maior priority)
  select
    pli.product_id,
    pli.price as amount,
    pl.id as price_list_id,
    pl.slug as price_list_slug
  into v_row
  from public.price_list_items pli
  join public.price_lists pl on pl.id = pli.price_list_id
  where pli.product_id = p_product_id
    and pl.scope = 'public'
    and pl.status = 'active'
    and (pl.valid_from is null or pl.valid_from <= v_at)
    and (pl.valid_until is null or pl.valid_until >= v_at)
  order by pl.priority desc, pl.updated_at desc
  limit 1;

  if found then
    product_id := v_row.product_id;
    amount := v_row.amount;
    price_list_id := v_row.price_list_id;
    price_list_slug := v_row.price_list_slug;
    used_override := false;
    used_default_fallback := false;
    return next;
    return;
  end if;

  -- 2) Fallback lista default
  select
    pli.product_id,
    pli.price as amount,
    pl.id as price_list_id,
    pl.slug as price_list_slug
  into v_row
  from public.price_list_items pli
  join public.price_lists pl on pl.id = pli.price_list_id
  where pli.product_id = p_product_id
    and pl.is_default = true
  limit 1;

  if found then
    product_id := v_row.product_id;
    amount := v_row.amount;
    price_list_id := v_row.price_list_id;
    price_list_slug := v_row.price_list_slug;
    used_override := false;
    used_default_fallback := true;
    return next;
    return;
  end if;

  raise exception 'price_unresolved: produto % sem preço em lista', p_product_id
    using errcode = 'P0001';
end;
$$;

revoke all on function public.resolve_product_price(uuid, uuid, timestamptz) from public;
grant execute on function public.resolve_product_price(uuid, uuid, timestamptz) to anon, authenticated;

create or replace function public.resolve_product_prices(
  p_product_ids uuid[],
  p_customer_id uuid default null,
  p_at timestamptz default now()
)
returns table (
  product_id uuid,
  amount numeric,
  price_list_id uuid,
  price_list_slug text,
  used_override boolean,
  used_default_fallback boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  pid uuid;
begin
  if p_product_ids is null then
    return;
  end if;
  foreach pid in array p_product_ids
  loop
    begin
      return query
        select r.product_id, r.amount, r.price_list_id, r.price_list_slug,
               r.used_override, r.used_default_fallback
        from public.resolve_product_price(pid, p_customer_id, p_at) r;
    exception when others then
      null;
    end;
  end loop;
end;
$$;

revoke all on function public.resolve_product_prices(uuid[], uuid, timestamptz) from public;
grant execute on function public.resolve_product_prices(uuid[], uuid, timestamptz) to anon, authenticated;
