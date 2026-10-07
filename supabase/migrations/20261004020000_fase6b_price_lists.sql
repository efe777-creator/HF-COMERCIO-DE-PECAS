-- Fase 6B — Listas de preços: schema, seed, resolve, sync legado, place_order

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------
create table if not exists public.price_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'inactive')),
  scope text not null default 'public'
    check (scope in ('public', 'assigned')),
  priority int not null default 0,
  valid_from timestamptz,
  valid_until timestamptz,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists price_lists_one_default_uidx
  on public.price_lists (is_default)
  where is_default = true;

create table if not exists public.price_list_items (
  id uuid primary key default gen_random_uuid(),
  price_list_id uuid not null references public.price_lists (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  price numeric(12, 2) not null check (price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (price_list_id, product_id)
);

create index if not exists price_list_items_product_idx
  on public.price_list_items (product_id);

create table if not exists public.price_change_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  price_list_id uuid not null references public.price_lists (id) on delete cascade,
  old_price numeric(12, 2),
  new_price numeric(12, 2) not null,
  changed_by uuid references auth.users (id) on delete set null,
  source text not null check (source in ('manual', 'import', 'system')),
  import_id uuid references public.imports (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.order_items
  add column if not exists price_list_id uuid references public.price_lists (id) on delete set null;

alter table public.imports
  add column if not exists kind text not null default 'generic';

alter table public.imports
  add column if not exists price_list_id uuid references public.price_lists (id) on delete set null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists price_lists_updated_at on public.price_lists;
create trigger price_lists_updated_at
  before update on public.price_lists
  for each row execute function public.set_updated_at();

drop trigger if exists price_list_items_updated_at on public.price_list_items;
create trigger price_list_items_updated_at
  before update on public.price_list_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.price_lists enable row level security;
alter table public.price_list_items enable row level security;
alter table public.price_change_history enable row level security;

-- Leitura pública sem is_staff() (anon não tem EXECUTE em is_staff)
drop policy if exists price_lists_public_read on public.price_lists;
create policy price_lists_public_read on public.price_lists
  for select using (scope = 'public' and status = 'active');

drop policy if exists price_lists_staff_select on public.price_lists;
create policy price_lists_staff_select on public.price_lists
  for select to authenticated using (public.is_staff());

drop policy if exists price_lists_staff_insert on public.price_lists;
create policy price_lists_staff_insert on public.price_lists
  for insert to authenticated with check (public.is_staff());

drop policy if exists price_lists_staff_update on public.price_lists;
create policy price_lists_staff_update on public.price_lists
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists price_lists_staff_delete on public.price_lists;
create policy price_lists_staff_delete on public.price_lists
  for delete to authenticated using (public.is_staff());

drop policy if exists price_list_items_public_read on public.price_list_items;
create policy price_list_items_public_read on public.price_list_items
  for select using (
    exists (
      select 1 from public.price_lists pl
      where pl.id = price_list_id
        and pl.scope = 'public'
        and pl.status = 'active'
    )
  );

drop policy if exists price_list_items_staff_select on public.price_list_items;
create policy price_list_items_staff_select on public.price_list_items
  for select to authenticated using (public.is_staff());

drop policy if exists price_list_items_staff_insert on public.price_list_items;
create policy price_list_items_staff_insert on public.price_list_items
  for insert to authenticated with check (public.is_staff());

drop policy if exists price_list_items_staff_update on public.price_list_items;
create policy price_list_items_staff_update on public.price_list_items
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists price_list_items_staff_delete on public.price_list_items;
create policy price_list_items_staff_delete on public.price_list_items
  for delete to authenticated using (public.is_staff());

drop policy if exists price_change_history_staff_select on public.price_change_history;
create policy price_change_history_staff_select on public.price_change_history
  for select to authenticated using (public.is_staff());

drop policy if exists price_change_history_staff_insert on public.price_change_history;
create policy price_change_history_staff_insert on public.price_change_history
  for insert to authenticated with check (public.is_staff());

grant select on public.price_lists to anon, authenticated;
grant select on public.price_list_items to anon, authenticated;
grant select on public.price_change_history to authenticated;
grant insert, update, delete on public.price_lists to authenticated;
grant insert, update, delete on public.price_list_items to authenticated;
grant insert on public.price_change_history to authenticated;

-- ---------------------------------------------------------------------------
-- Seed Base + Promocional
-- ---------------------------------------------------------------------------
insert into public.price_lists (id, name, slug, description, status, scope, priority, is_default)
values
  ('a1111111-1111-1111-1111-111111111101', 'Preço Base', 'preco-base',
   'Lista padrão / fallback comercial', 'active', 'public', 0, true),
  ('a1111111-1111-1111-1111-111111111102', 'Lista Promocional', 'promocional',
   'Preços promocionais da vitrine', 'active', 'public', 100, false)
on conflict (slug) do update set
  name = excluded.name,
  status = excluded.status,
  scope = excluded.scope,
  priority = excluded.priority,
  is_default = excluded.is_default,
  updated_at = now();

-- Migrar products.price → Base
insert into public.price_list_items (price_list_id, product_id, price)
select 'a1111111-1111-1111-1111-111111111101'::uuid, p.id, p.price
from public.products p
on conflict (price_list_id, product_id) do update
  set price = excluded.price, updated_at = now();

-- Migrar promo_price → Promocional
insert into public.price_list_items (price_list_id, product_id, price)
select 'a1111111-1111-1111-1111-111111111102'::uuid, p.id, p.promo_price
from public.products p
where p.promo_price is not null
on conflict (price_list_id, product_id) do update
  set price = excluded.price, updated_at = now();

insert into public.price_change_history (product_id, price_list_id, old_price, new_price, source)
select pli.product_id, pli.price_list_id, null, pli.price, 'system'
from public.price_list_items pli
where not exists (
  select 1 from public.price_change_history h
  where h.product_id = pli.product_id and h.price_list_id = pli.price_list_id and h.source = 'system'
);

-- ---------------------------------------------------------------------------
-- resolve_product_price
-- ---------------------------------------------------------------------------
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
begin
  -- p_customer_id reservado para scope=assigned (futuro); F6B storefront ignora
  select
    pli.product_id,
    pli.price as amount,
    pl.id as price_list_id,
    pl.slug as price_list_slug,
    false as used_default_fallback
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
    used_default_fallback := false;
    return next;
    return;
  end if;

  select
    pli.product_id,
    pli.price as amount,
    pl.id as price_list_id,
    pl.slug as price_list_slug,
    true as used_default_fallback
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
        select r.product_id, r.amount, r.price_list_id, r.price_list_slug, r.used_default_fallback
        from public.resolve_product_price(pid, p_customer_id, p_at) r;
    exception when others then
      -- skip unresolved in batch (caller trata ausência)
      null;
    end;
  end loop;
end;
$$;

revoke all on function public.resolve_product_prices(uuid[], uuid, timestamptz) from public;
grant execute on function public.resolve_product_prices(uuid[], uuid, timestamptz) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Sync legado: item Base → products.price; Promocional → promo_price
-- ---------------------------------------------------------------------------
create or replace function public.sync_product_price_from_list_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
begin
  select slug into v_slug from public.price_lists where id = coalesce(new.price_list_id, old.price_list_id);
  if v_slug = 'preco-base' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    update public.products set price = new.price, updated_at = now() where id = new.product_id;
  elsif v_slug = 'promocional' then
    if tg_op = 'DELETE' then
      update public.products set promo_price = null, updated_at = now() where id = old.product_id;
      return old;
    end if;
    update public.products set promo_price = new.price, updated_at = now() where id = new.product_id;
  end if;
  return new;
end;
$$;

drop trigger if exists price_list_items_sync_products on public.price_list_items;
create trigger price_list_items_sync_products
  after insert or update or delete on public.price_list_items
  for each row execute function public.sync_product_price_from_list_item();

-- ---------------------------------------------------------------------------
-- place_order: usar resolve_product_price + price_list_id
-- ---------------------------------------------------------------------------
create or replace function public.place_order(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_customer_id uuid;
  v_idempotency uuid;
  v_address_id uuid;
  v_shipping_option_id text;
  v_payment_method text;
  v_doc_kind text;
  v_doc_value text;
  v_existing_id uuid;
  v_existing_status text;
  v_existing_total numeric;
  v_addr record;
  v_ship record;
  v_item jsonb;
  v_product_id uuid;
  v_qty int;
  v_prod record;
  v_avail int;
  v_unit numeric;
  v_price_list_id uuid;
  v_subtotal numeric := 0;
  v_shipping_amount numeric := 0;
  v_total numeric := 0;
  v_order_id uuid;
  v_payment_id uuid;
  v_cart_id uuid;
  v_items jsonb;
  v_address_snapshot jsonb;
  v_sku text;
  v_name text;
  v_resolved record;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '42501';
  end if;

  select c.id into v_customer_id from public.customers c where c.profile_id = v_uid;
  if v_customer_id is null then
    raise exception 'Cliente não encontrado' using errcode = 'P0001';
  end if;

  v_idempotency := nullif(p_payload ->> 'idempotency_key', '')::uuid;
  if v_idempotency is null then
    raise exception 'idempotency_key obrigatória' using errcode = 'P0001';
  end if;

  select o.id, o.status, o.total
    into v_existing_id, v_existing_status, v_existing_total
  from public.orders o
  where o.customer_id = v_customer_id and o.idempotency_key = v_idempotency;

  if v_existing_id is not null then
    return jsonb_build_object(
      'order_id', v_existing_id,
      'status', v_existing_status,
      'total', v_existing_total,
      'already_existed', true
    );
  end if;

  v_address_id := nullif(p_payload ->> 'address_id', '')::uuid;
  v_shipping_option_id := nullif(p_payload ->> 'shipping_option_id', '');
  v_payment_method := nullif(p_payload ->> 'payment_method', '');
  v_doc_kind := nullif(p_payload ->> 'document_kind', '');
  v_doc_value := regexp_replace(coalesce(p_payload ->> 'document_value', ''), '\D', '', 'g');

  if v_address_id is null then
    raise exception 'Endereço obrigatório' using errcode = 'P0001';
  end if;
  if v_shipping_option_id is null then
    raise exception 'Opção de frete obrigatória' using errcode = 'P0001';
  end if;
  if v_payment_method not in ('pix_simulated', 'card_simulated') then
    raise exception 'Método de pagamento inválido' using errcode = 'P0001';
  end if;

  if v_doc_kind = 'cpf' then
    if length(v_doc_value) <> 11 then
      raise exception 'CPF inválido' using errcode = 'P0001';
    end if;
    update public.customers set cpf = v_doc_value, cnpj = null where id = v_customer_id;
  elsif v_doc_kind = 'cnpj' then
    if length(v_doc_value) <> 14 then
      raise exception 'CNPJ inválido' using errcode = 'P0001';
    end if;
    update public.customers set cnpj = v_doc_value, cpf = null where id = v_customer_id;
  else
    raise exception 'document_kind deve ser cpf ou cnpj' using errcode = 'P0001';
  end if;

  select * into v_addr
  from public.customer_addresses a
  where a.id = v_address_id and a.customer_id = v_customer_id;
  if not found then
    raise exception 'Endereço não encontrado' using errcode = 'P0001';
  end if;

  select * into v_ship
  from public.resolve_mock_shipping_option(v_shipping_option_id, v_addr.postal_code);
  v_shipping_amount := v_ship.amount;

  v_address_snapshot := jsonb_build_object(
    'id', v_addr.id,
    'recipient', v_addr.recipient,
    'street', v_addr.street,
    'number', v_addr.number,
    'complement', v_addr.complement,
    'district', v_addr.district,
    'city', v_addr.city,
    'state', v_addr.state,
    'postal_code', v_addr.postal_code,
    'label', v_addr.label
  );

  v_items := p_payload -> 'items';
  if v_items is null or jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
    select c.id into v_cart_id from public.carts c where c.customer_id = v_customer_id;
    if v_cart_id is null then
      raise exception 'Carrinho vazio' using errcode = 'P0001';
    end if;
    select coalesce(jsonb_agg(jsonb_build_object(
      'product_id', ci.product_id,
      'quantity', ci.quantity
    )), '[]'::jsonb)
      into v_items
    from public.cart_items ci
    where ci.cart_id = v_cart_id;
  end if;

  if v_items is null or jsonb_array_length(v_items) = 0 then
    raise exception 'Carrinho vazio' using errcode = 'P0001';
  end if;

  for v_item in select * from jsonb_array_elements(v_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_qty := greatest(1, coalesce((v_item ->> 'quantity')::int, 0));
    if v_qty < 1 then
      raise exception 'Quantidade inválida' using errcode = 'P0001';
    end if;

    select p.id, p.sku, p.name, p.status, p.is_available
      into v_prod
    from public.products p
    where p.id = v_product_id
    for update;

    if not found then
      raise exception 'Produto não encontrado' using errcode = 'P0001';
    end if;
    if v_prod.status <> 'published' or v_prod.is_available is not true then
      raise exception 'Produto indisponível: %', v_prod.sku using errcode = 'P0001';
    end if;

    select coalesce(i.quantity_on_hand, 0) - coalesce(i.quantity_reserved, 0)
      into v_avail
    from public.inventory i
    where i.product_id = v_product_id
    for update;

    if v_avail is null or v_avail < v_qty then
      raise exception 'Estoque insuficiente: %', v_prod.sku using errcode = 'P0001';
    end if;

    select * into v_resolved from public.resolve_product_price(v_product_id, v_customer_id, now());
    v_unit := v_resolved.amount;
    v_subtotal := v_subtotal + (v_unit * v_qty);
  end loop;

  v_total := v_subtotal + v_shipping_amount;

  insert into public.orders (
    customer_id, status, subtotal, shipping_amount, total,
    address_snapshot, payment_ref, idempotency_key
  ) values (
    v_customer_id, 'aguardando_pagamento', v_subtotal, v_shipping_amount, v_total,
    v_address_snapshot, v_payment_method, v_idempotency
  )
  returning id into v_order_id;

  insert into public.order_status_history (order_id, status, note, changed_by)
  values (v_order_id, 'aguardando_pagamento', 'Pedido criado (F6/F6B)', v_uid);

  for v_item in select * from jsonb_array_elements(v_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_qty := greatest(1, coalesce((v_item ->> 'quantity')::int, 0));

    select p.sku, p.name into v_sku, v_name from public.products p where p.id = v_product_id;
    select * into v_resolved from public.resolve_product_price(v_product_id, v_customer_id, now());
    v_unit := v_resolved.amount;
    v_price_list_id := v_resolved.price_list_id;

    insert into public.order_items (
      order_id, product_id, sku, name_snapshot, unit_price, quantity, price_list_id
    ) values (
      v_order_id, v_product_id, v_sku, v_name, v_unit, v_qty, v_price_list_id
    );

    update public.inventory
    set quantity_reserved = quantity_reserved + v_qty, updated_at = now()
    where product_id = v_product_id;

    insert into public.inventory_movements (product_id, type, quantity, reason, order_id, user_id)
    values (v_product_id, 'reserve', v_qty, 'place_order', v_order_id, v_uid);
  end loop;

  insert into public.shipments (order_id, provider, status, amount, metadata)
  values (
    v_order_id, v_ship.provider, 'pending', v_shipping_amount,
    jsonb_build_object(
      'option_id', v_ship.option_id,
      'service_code', v_ship.service_code,
      'label', v_ship.label,
      'eta_days_min', v_ship.eta_days_min,
      'eta_days_max', v_ship.eta_days_max
    )
  );

  insert into public.payments (order_id, provider, status, amount, external_ref, metadata)
  values (
    v_order_id, 'simulated', 'pending', v_total,
    'sim-' || left(v_order_id::text, 8),
    jsonb_build_object('method', v_payment_method)
  )
  returning id into v_payment_id;

  select c.id into v_cart_id from public.carts c where c.customer_id = v_customer_id;
  if v_cart_id is not null then
    delete from public.cart_items where cart_id = v_cart_id;
  end if;

  return jsonb_build_object(
    'order_id', v_order_id,
    'status', 'aguardando_pagamento',
    'total', v_total,
    'payment_id', v_payment_id,
    'already_existed', false
  );
end;
$$;
