-- FAL auditoria: validação CPF/CNPJ com dígitos verificadores no backend (place_order).

create or replace function public.is_valid_cpf(p_cpf text)
returns boolean
language plpgsql
immutable
as $$
declare
  v text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  s int;
  d1 int;
  d2 int;
  i int;
begin
  if length(v) <> 11 then
    return false;
  end if;
  if v ~ '^(\d)\1+$' then
    return false;
  end if;

  s := 0;
  for i in 1..9 loop
    s := s + (substr(v, i, 1)::int * (11 - i));
  end loop;
  d1 := (s * 10) % 11;
  if d1 = 10 then d1 := 0; end if;
  if d1 <> substr(v, 10, 1)::int then
    return false;
  end if;

  s := 0;
  for i in 1..10 loop
    s := s + (substr(v, i, 1)::int * (12 - i));
  end loop;
  d2 := (s * 10) % 11;
  if d2 = 10 then d2 := 0; end if;
  return d2 = substr(v, 11, 1)::int;
end;
$$;

create or replace function public.is_valid_cnpj(p_cnpj text)
returns boolean
language plpgsql
immutable
as $$
declare
  v text := regexp_replace(coalesce(p_cnpj, ''), '\D', '', 'g');
  w1 int[] := array[5,4,3,2,9,8,7,6,5,4,3,2];
  w2 int[] := array[6,5,4,3,2,9,8,7,6,5,4,3,2];
  s int;
  d1 int;
  d2 int;
  i int;
begin
  if length(v) <> 14 then
    return false;
  end if;
  if v ~ '^(\d)\1+$' then
    return false;
  end if;

  s := 0;
  for i in 1..12 loop
    s := s + (substr(v, i, 1)::int * w1[i]);
  end loop;
  d1 := s % 11;
  d1 := case when d1 < 2 then 0 else 11 - d1 end;
  if d1 <> substr(v, 13, 1)::int then
    return false;
  end if;

  s := 0;
  for i in 1..13 loop
    s := s + (substr(v, i, 1)::int * w2[i]);
  end loop;
  d2 := s % 11;
  d2 := case when d2 < 2 then 0 else 11 - d2 end;
  return d2 = substr(v, 14, 1)::int;
end;
$$;

-- Recria place_order com validação de DV (corpo alinhado a F6B).
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

revoke all on function public.place_order(jsonb) from public;
grant execute on function public.place_order(jsonb) to authenticated;
