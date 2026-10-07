-- F8 Fatia A: modos de estoque da loja + snapshot no pedido + fluxos + adjust_inventory
-- Regra: com_estoque permanece equivalente ao F7 (reserva / release / fulfill).

-- ---------------------------------------------------------------------------
-- Helpers de role (F8)
-- ---------------------------------------------------------------------------
create or replace function public.is_administrador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'administrador'
  );
$$;

create or replace function public.staff_can_adjust_inventory()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('administrador', 'gerente', 'estoque')
  );
$$;

create or replace function public.staff_can_view_customers_f8()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('administrador', 'gerente', 'operador')
  );
$$;

create or replace function public.staff_can_view_reports_f8()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('administrador', 'gerente', 'operador')
  );
$$;

-- ---------------------------------------------------------------------------
-- store_settings (singleton)
-- ---------------------------------------------------------------------------
create table if not exists public.store_settings (
  id uuid primary key default gen_random_uuid(),
  inventory_mode text not null default 'com_estoque'
    check (inventory_mode in ('com_estoque', 'estoque_ficticio', 'sem_estoque')),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create unique index if not exists store_settings_singleton
  on public.store_settings ((true));

alter table public.store_settings enable row level security;

drop policy if exists store_settings_staff_select on public.store_settings;
create policy store_settings_staff_select on public.store_settings
  for select to authenticated using (public.is_staff());

-- Mutations only via SECURITY DEFINER RPCs
revoke insert, update, delete on public.store_settings from authenticated;
revoke insert, update, delete on public.store_settings from anon;
grant select on public.store_settings to authenticated;

insert into public.store_settings (inventory_mode)
select 'com_estoque'
where not exists (select 1 from public.store_settings);

-- ---------------------------------------------------------------------------
-- Snapshot no pedido
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists inventory_mode_at_order text
    check (
      inventory_mode_at_order is null
      or inventory_mode_at_order in ('com_estoque', 'estoque_ficticio', 'sem_estoque')
    );

update public.orders
set inventory_mode_at_order = 'com_estoque'
where inventory_mode_at_order is null;

alter table public.orders
  alter column inventory_mode_at_order set default 'com_estoque';

alter table public.orders
  alter column inventory_mode_at_order set not null;

-- ---------------------------------------------------------------------------
-- Get / set inventory mode
-- ---------------------------------------------------------------------------
create or replace function public.get_store_inventory_mode()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_mode text;
begin
  select s.inventory_mode into v_mode from public.store_settings s limit 1;
  return coalesce(v_mode, 'com_estoque');
end;
$$;

create or replace function public.set_store_inventory_mode(p_mode text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado' using errcode = '42501';
  end if;
  if not public.is_administrador() then
    raise exception 'Somente administrador pode alterar o modo de estoque' using errcode = '42501';
  end if;
  if p_mode not in ('com_estoque', 'estoque_ficticio', 'sem_estoque') then
    raise exception 'Modo de estoque inválido' using errcode = 'P0001';
  end if;

  update public.store_settings
  set inventory_mode = p_mode, updated_at = now(), updated_by = auth.uid();

  if not found then
    insert into public.store_settings (inventory_mode, updated_by)
    values (p_mode, auth.uid());
  end if;

  return p_mode;
end;
$$;

revoke all on function public.get_store_inventory_mode() from public;
grant execute on function public.get_store_inventory_mode() to authenticated;

revoke all on function public.set_store_inventory_mode(text) from public;
grant execute on function public.set_store_inventory_mode(text) to authenticated;

-- ---------------------------------------------------------------------------
-- release / fulfill respeitam snapshot do pedido
-- ---------------------------------------------------------------------------
create or replace function public.release_order_reservations(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_mode text;
begin
  select coalesce(o.inventory_mode_at_order, 'com_estoque')
    into v_mode
  from public.orders o
  where o.id = p_order_id;

  if v_mode is null then
    return;
  end if;

  -- Modos sem reserva real: no-op (não altera saldo)
  if v_mode <> 'com_estoque' then
    return;
  end if;

  for r in
    select oi.product_id, oi.quantity
    from public.order_items oi
    where oi.order_id = p_order_id and oi.product_id is not null
  loop
    update public.inventory i
    set quantity_reserved = greatest(0, i.quantity_reserved - r.quantity),
        updated_at = now()
    where i.product_id = r.product_id;

    insert into public.inventory_movements (product_id, type, quantity, reason, order_id, user_id)
    values (r.product_id, 'release', r.quantity, 'payment_failed_or_cancel', p_order_id, auth.uid());
  end loop;
end;
$$;

create or replace function public.fulfill_order_reservations(p_order_id uuid, p_user_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_mode text;
begin
  select coalesce(o.inventory_mode_at_order, 'com_estoque')
    into v_mode
  from public.orders o
  where o.id = p_order_id;

  if v_mode is null then
    return;
  end if;

  if v_mode <> 'com_estoque' then
    return;
  end if;

  for r in
    select oi.product_id, oi.quantity
    from public.order_items oi
    where oi.order_id = p_order_id and oi.product_id is not null
  loop
    update public.inventory inv
    set
      quantity_reserved = greatest(0, inv.quantity_reserved - r.quantity),
      quantity_on_hand = inv.quantity_on_hand - r.quantity,
      updated_at = now()
    where inv.product_id = r.product_id
      and inv.quantity_on_hand >= r.quantity;

    if not found then
      raise exception 'Estoque insuficiente para baixa do produto %', r.product_id using errcode = 'P0001';
    end if;

    insert into public.inventory_movements (product_id, type, quantity, reason, order_id, user_id)
    values (r.product_id, 'out', r.quantity, 'order_shipped', p_order_id, p_user_id);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- place_order: snapshot + reserva só em com_estoque
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
  v_inv_mode text;
  v_track boolean;
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

  v_inv_mode := public.get_store_inventory_mode();
  v_track := (v_inv_mode = 'com_estoque');

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
    if not public.is_valid_cpf(v_doc_value) then
      raise exception 'CPF inválido' using errcode = 'P0001';
    end if;
    update public.customers set cpf = v_doc_value, cnpj = null where id = v_customer_id;
  elsif v_doc_kind = 'cnpj' then
    if not public.is_valid_cnpj(v_doc_value) then
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

    if v_track then
      select coalesce(i.quantity_on_hand, 0) - coalesce(i.quantity_reserved, 0)
        into v_avail
      from public.inventory i
      where i.product_id = v_product_id
      for update;

      if v_avail is null or v_avail < v_qty then
        raise exception 'Estoque insuficiente: %', v_prod.sku using errcode = 'P0001';
      end if;
    end if;

    select * into v_resolved from public.resolve_product_price(v_product_id, v_customer_id, now());
    v_unit := v_resolved.amount;
    v_subtotal := v_subtotal + (v_unit * v_qty);
  end loop;

  v_total := v_subtotal + v_shipping_amount;

  insert into public.orders (
    customer_id, status, subtotal, shipping_amount, total,
    address_snapshot, payment_ref, idempotency_key, inventory_mode_at_order
  ) values (
    v_customer_id, 'aguardando_pagamento', v_subtotal, v_shipping_amount, v_total,
    v_address_snapshot, v_payment_method, v_idempotency, v_inv_mode
  )
  returning id into v_order_id;

  insert into public.order_status_history (order_id, status, note, changed_by)
  values (v_order_id, 'aguardando_pagamento', 'Pedido criado (F6/F6B/F8)', v_uid);

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

    if v_track then
      update public.inventory
      set quantity_reserved = quantity_reserved + v_qty, updated_at = now()
      where product_id = v_product_id;

      insert into public.inventory_movements (product_id, type, quantity, reason, order_id, user_id)
      values (v_product_id, 'reserve', v_qty, 'place_order', v_order_id, v_uid);
    end if;
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
    'already_existed', false,
    'inventory_mode_at_order', v_inv_mode
  );
end;
$$;

revoke all on function public.place_order(jsonb) from public;
grant execute on function public.place_order(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- adjust_inventory + proteção PostgREST
-- ---------------------------------------------------------------------------
create or replace function public.adjust_inventory(
  p_product_id uuid,
  p_delta int,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_on_hand int;
  v_reserved int;
  v_new int;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '42501';
  end if;
  if not public.staff_can_adjust_inventory() then
    raise exception 'Sem permissão para ajustar estoque' using errcode = '42501';
  end if;
  if p_product_id is null then
    raise exception 'Produto obrigatório' using errcode = 'P0001';
  end if;
  if p_delta = 0 then
    raise exception 'Delta não pode ser zero' using errcode = 'P0001';
  end if;

  insert into public.inventory (product_id, quantity_on_hand, quantity_reserved)
  values (p_product_id, 0, 0)
  on conflict (product_id) do nothing;

  select quantity_on_hand, quantity_reserved
    into v_on_hand, v_reserved
  from public.inventory
  where product_id = p_product_id
  for update;

  v_new := v_on_hand + p_delta;
  if v_new < 0 then
    raise exception 'Saldo não pode ficar negativo' using errcode = 'P0001';
  end if;
  if v_new < v_reserved then
    raise exception 'Saldo físico não pode ser menor que a reserva (%s)', v_reserved using errcode = 'P0001';
  end if;

  update public.inventory
  set quantity_on_hand = v_new, updated_at = now()
  where product_id = p_product_id;

  insert into public.inventory_movements (product_id, type, quantity, reason, user_id)
  values (
    p_product_id,
    'adjust',
    p_delta,
    coalesce(nullif(trim(p_reason), ''), 'ajuste_manual'),
    v_uid
  );

  return jsonb_build_object(
    'product_id', p_product_id,
    'quantity_on_hand', v_new,
    'quantity_reserved', v_reserved,
    'delta', p_delta
  );
end;
$$;

revoke all on function public.adjust_inventory(uuid, int, text) from public;
grant execute on function public.adjust_inventory(uuid, int, text) to authenticated;

-- Impede UPDATE/DELETE direto via JWT (mutações via RPC DEFINER)
revoke update, delete on public.inventory from authenticated;
revoke update, delete on public.inventory from anon;
revoke insert, update, delete on public.inventory_movements from authenticated;
revoke insert, update, delete on public.inventory_movements from anon;

grant select on public.inventory to authenticated;
grant select on public.inventory_movements to authenticated;

-- ---------------------------------------------------------------------------
-- Contadores básicos para relatórios F8
-- ---------------------------------------------------------------------------
create or replace function public.admin_orders_basic_totals()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_out jsonb;
begin
  if not public.staff_can_view_reports_f8() then
    raise exception 'Sem permissão para relatórios' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'orders_total', count(*)::int,
    'orders_open', count(*) filter (
      where status not in ('entregue', 'cancelado')
    )::int,
    'orders_delivered', count(*) filter (where status = 'entregue')::int,
    'orders_cancelled', count(*) filter (where status = 'cancelado')::int,
    'revenue_delivered', coalesce(sum(total) filter (where status = 'entregue'), 0)
  )
  into v_out
  from public.orders;

  return coalesce(v_out, '{}'::jsonb);
end;
$$;

revoke all on function public.admin_orders_basic_totals() from public;
grant execute on function public.admin_orders_basic_totals() to authenticated;

grant execute on function public.is_administrador() to authenticated;
grant execute on function public.staff_can_adjust_inventory() to authenticated;
grant execute on function public.staff_can_view_customers_f8() to authenticated;
grant execute on function public.staff_can_view_reports_f8() to authenticated;

-- Disponibilidade espelhada do saldo só em com_estoque (modos não-reais usam is_available comercial)
create or replace function public.sync_product_availability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mode text;
begin
  v_mode := public.get_store_inventory_mode();
  if v_mode is distinct from 'com_estoque' then
    return new;
  end if;
  update public.products
  set is_available = (coalesce(new.quantity_on_hand, 0) - coalesce(new.quantity_reserved, 0)) > 0
  where id = new.product_id;
  return new;
end;
$$;
