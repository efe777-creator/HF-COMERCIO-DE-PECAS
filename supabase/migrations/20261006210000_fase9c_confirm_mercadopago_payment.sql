-- F9-C — confirma pagamento Mercado Pago (somente service_role / Edge webhook).
-- Espelha o ciclo approve de confirm_simulated_payment: pagamento_aprovado → recebido → em_analise.
-- NÃO cancela pedido em rejected (política F9-C: nova tentativa = novo create-mp-payment).

create or replace function public.confirm_mercadopago_payment(p_payment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pay record;
  v_order record;
begin
  -- Bloqueia chamada via JWT authenticated/anon; Edge usa service_role.
  if auth.role() is distinct from 'service_role' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select p.* into v_pay
  from public.payments p
  where p.id = p_payment_id
  for update;

  if not found then
    raise exception 'Pagamento não encontrado' using errcode = 'P0001';
  end if;

  if v_pay.provider <> 'mercadopago' then
    raise exception 'Somente pagamento mercadopago' using errcode = 'P0001';
  end if;

  select * into v_order from public.orders where id = v_pay.order_id for update;

  if v_pay.status = 'approved' then
    return jsonb_build_object(
      'payment_id', v_pay.id,
      'provider', 'mercadopago',
      'status', 'approved',
      'order_id', v_order.id,
      'order_status', v_order.status,
      'reused', true
    );
  end if;

  if v_pay.status <> 'pending' then
    raise exception 'Pagamento não está pending' using errcode = 'P0001';
  end if;

  if v_order.status <> 'aguardando_pagamento' then
    raise exception 'Pedido não aguarda pagamento' using errcode = 'P0001';
  end if;

  update public.payments
  set status = 'approved', paid_at = coalesce(paid_at, now())
  where id = v_pay.id;

  update public.orders set status = 'pagamento_aprovado', updated_at = now() where id = v_order.id;
  insert into public.order_status_history (order_id, status, note, changed_by)
  values (v_order.id, 'pagamento_aprovado', 'Pagamento Mercado Pago aprovado (webhook)', null);
  perform public.emit_order_event(
    v_order.id, 'payment_approved', 'customer',
    jsonb_build_object('payment_id', v_pay.id, 'provider', 'mercadopago'), null
  );

  update public.orders set status = 'recebido', updated_at = now() where id = v_order.id;
  insert into public.order_status_history (order_id, status, note, changed_by)
  values (v_order.id, 'recebido', 'Pedido recebido pela FAL', null);
  perform public.emit_order_event(v_order.id, 'order_received', 'customer', '{}'::jsonb, null);

  update public.orders set status = 'em_analise', updated_at = now() where id = v_order.id;
  insert into public.order_status_history (order_id, status, note, changed_by)
  values (v_order.id, 'em_analise', 'Pedido em confirmação', null);
  perform public.emit_order_event(v_order.id, 'confirmation_started', 'internal', '{}'::jsonb, null);

  return jsonb_build_object(
    'payment_id', v_pay.id,
    'provider', 'mercadopago',
    'status', 'approved',
    'order_id', v_order.id,
    'order_status', 'em_analise'
  );
end;
$$;

revoke all on function public.confirm_mercadopago_payment(uuid) from public;
revoke all on function public.confirm_mercadopago_payment(uuid) from anon;
revoke all on function public.confirm_mercadopago_payment(uuid) from authenticated;
grant execute on function public.confirm_mercadopago_payment(uuid) to service_role;

comment on function public.confirm_mercadopago_payment(uuid) is
  'F9-C: aprova payment mercadopago + ciclo F7. Somente service_role (webhook Edge).';
