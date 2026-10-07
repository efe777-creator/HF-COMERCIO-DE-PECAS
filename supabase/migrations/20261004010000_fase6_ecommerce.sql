-- Fase 6 — E-commerce: place_order + pagamento simulado + frete mock server-side
-- SECURITY DEFINER; cliente não fabrica totais.

-- ---------------------------------------------------------------------------
-- Schema adjustments
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists idempotency_key uuid;

create unique index if not exists orders_customer_idempotency_uidx
  on public.orders (customer_id, idempotency_key)
  where idempotency_key is not null;

update public.payments
set status = 'pending'
where status is null
   or status not in ('pending', 'approved', 'failed', 'cancelled');

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check
  check (status in ('pending', 'approved', 'failed', 'cancelled'));

update public.shipments
set status = 'pending'
where status is null
   or status not in ('pending', 'ready', 'shipped', 'delivered', 'cancelled');

alter table public.shipments drop constraint if exists shipments_status_check;
alter table public.shipments
  add constraint shipments_status_check
  check (status in ('pending', 'ready', 'shipped', 'delivered', 'cancelled'));

-- ---------------------------------------------------------------------------
-- Mock shipping (mesma lógica do adapter TS)
-- ---------------------------------------------------------------------------
create or replace function public.mock_shipping_region_surcharge(p_postal_code text)
returns numeric
language sql
immutable
as $$
  select case
    when left(regexp_replace(coalesce(p_postal_code, ''), '\D', '', 'g'), 1) in ('0', '1', '2', '3') then 0::numeric
    when left(regexp_replace(coalesce(p_postal_code, ''), '\D', '', 'g'), 1) in ('4', '5', '6') then 5::numeric
    else 10::numeric
  end;
$$;

create or replace function public.resolve_mock_shipping_option(
  p_option_id text,
  p_postal_code text
)
returns table (
  option_id text,
  provider text,
  service_code text,
  label text,
  amount numeric,
  eta_days_min int,
  eta_days_max int
)
language plpgsql
stable
as $$
declare
  v_surcharge numeric := public.mock_shipping_region_surcharge(p_postal_code);
begin
  if p_option_id = 'mock:economic' then
    option_id := 'mock:economic';
    provider := 'mock';
    service_code := 'economic';
    label := 'Entrega econômica';
    amount := 29.90 + v_surcharge;
    eta_days_min := 5;
    eta_days_max := 8;
    return next;
  elsif p_option_id = 'mock:express' then
    option_id := 'mock:express';
    provider := 'mock';
    service_code := 'express';
    label := 'Entrega expressa';
    amount := 49.90 + v_surcharge;
    eta_days_min := 2;
    eta_days_max := 4;
    return next;
  elsif p_option_id = 'mock:pickup' then
    option_id := 'mock:pickup';
    provider := 'mock';
    service_code := 'pickup';
    label := 'Retirada na loja';
    amount := 0;
    eta_days_min := 0;
    eta_days_max := 1;
    return next;
  else
    raise exception 'Opção de frete inválida: %', p_option_id using errcode = 'P0001';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Helpers: release reservation
-- ---------------------------------------------------------------------------
create or replace function public.release_order_reservations(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
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

-- ---------------------------------------------------------------------------
-- place_order
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
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '42501';
  end if;

  select c.id into v_customer_id
  from public.customers c
  where c.profile_id = v_uid;

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

  select *
    into v_addr
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

  -- Validar itens e calcular subtotal (primeiro passe)
  for v_item in select * from jsonb_array_elements(v_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_qty := greatest(1, coalesce((v_item ->> 'quantity')::int, 0));
    if v_qty < 1 then
      raise exception 'Quantidade inválida' using errcode = 'P0001';
    end if;

    select p.id, p.sku, p.name, p.price, p.promo_price, p.status, p.is_available
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

    v_unit := coalesce(v_prod.promo_price, v_prod.price);
    v_subtotal := v_subtotal + (v_unit * v_qty);
  end loop;

  v_total := v_subtotal + v_shipping_amount;

  insert into public.orders (
    customer_id, status, subtotal, shipping_amount, total,
    address_snapshot, payment_ref, idempotency_key
  ) values (
    v_customer_id,
    'aguardando_pagamento',
    v_subtotal,
    v_shipping_amount,
    v_total,
    v_address_snapshot,
    v_payment_method,
    v_idempotency
  )
  returning id into v_order_id;

  insert into public.order_status_history (order_id, status, note, changed_by)
  values (v_order_id, 'aguardando_pagamento', 'Pedido criado (F6)', v_uid);

  -- Inserir itens + reservar
  for v_item in select * from jsonb_array_elements(v_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_qty := greatest(1, coalesce((v_item ->> 'quantity')::int, 0));

    select p.sku, p.name, coalesce(p.promo_price, p.price)
      into v_sku, v_name, v_unit
    from public.products p
    where p.id = v_product_id;

    insert into public.order_items (order_id, product_id, sku, name_snapshot, unit_price, quantity)
    values (v_order_id, v_product_id, v_sku, v_name, v_unit, v_qty);

    update public.inventory
    set quantity_reserved = quantity_reserved + v_qty,
        updated_at = now()
    where product_id = v_product_id;

    insert into public.inventory_movements (product_id, type, quantity, reason, order_id, user_id)
    values (v_product_id, 'reserve', v_qty, 'place_order', v_order_id, v_uid);
  end loop;

  insert into public.shipments (order_id, provider, status, amount, metadata)
  values (
    v_order_id,
    v_ship.provider,
    'pending',
    v_shipping_amount,
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
    v_order_id,
    'simulated',
    'pending',
    v_total,
    'sim-' || left(v_order_id::text, 8),
    jsonb_build_object('method', v_payment_method)
  )
  returning id into v_payment_id;

  -- Limpar carrinho do customer
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

revoke all on function public.place_order(jsonb) from public;
grant execute on function public.place_order(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- confirm_simulated_payment
-- ---------------------------------------------------------------------------
create or replace function public.confirm_simulated_payment(
  p_payment_id uuid,
  p_outcome text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_customer_id uuid;
  v_pay record;
  v_order record;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '42501';
  end if;

  if p_outcome not in ('approve', 'fail') then
    raise exception 'outcome inválido' using errcode = 'P0001';
  end if;

  select c.id into v_customer_id from public.customers c where c.profile_id = v_uid;
  if v_customer_id is null then
    raise exception 'Cliente não encontrado' using errcode = 'P0001';
  end if;

  select p.* into v_pay
  from public.payments p
  join public.orders o on o.id = p.order_id
  where p.id = p_payment_id and o.customer_id = v_customer_id
  for update;

  if not found then
    raise exception 'Pagamento não encontrado' using errcode = 'P0001';
  end if;

  if v_pay.provider <> 'simulated' then
    raise exception 'Somente pagamento simulado' using errcode = 'P0001';
  end if;

  if v_pay.status <> 'pending' then
    return jsonb_build_object(
      'payment_id', v_pay.id,
      'provider', 'simulated',
      'status', v_pay.status,
      'external_ref', v_pay.external_ref,
      'amount', v_pay.amount
    );
  end if;

  select * into v_order from public.orders where id = v_pay.order_id for update;

  if p_outcome = 'approve' then
    update public.payments set status = 'approved' where id = v_pay.id;
    update public.orders set status = 'pagamento_aprovado', updated_at = now() where id = v_order.id;
    insert into public.order_status_history (order_id, status, note, changed_by)
    values (v_order.id, 'pagamento_aprovado', 'Pagamento simulado aprovado', v_uid);

    return jsonb_build_object(
      'payment_id', v_pay.id,
      'provider', 'simulated',
      'status', 'approved',
      'external_ref', v_pay.external_ref,
      'amount', v_pay.amount,
      'order_id', v_order.id,
      'order_status', 'pagamento_aprovado'
    );
  end if;

  update public.payments set status = 'failed' where id = v_pay.id;
  perform public.release_order_reservations(v_order.id);
  update public.orders set status = 'cancelado', updated_at = now() where id = v_order.id;
  update public.shipments set status = 'cancelled' where order_id = v_order.id;
  insert into public.order_status_history (order_id, status, note, changed_by)
  values (v_order.id, 'cancelado', 'Pagamento simulado recusado — reserva liberada', v_uid);

  return jsonb_build_object(
    'payment_id', v_pay.id,
    'provider', 'simulated',
    'status', 'failed',
    'external_ref', v_pay.external_ref,
    'amount', v_pay.amount,
    'order_id', v_order.id,
    'order_status', 'cancelado'
  );
end;
$$;

revoke all on function public.confirm_simulated_payment(uuid, text) from public;
grant execute on function public.confirm_simulated_payment(uuid, text) to authenticated;

revoke all on function public.release_order_reservations(uuid) from public;
-- only callable from other security definer funcs / staff via SQL
