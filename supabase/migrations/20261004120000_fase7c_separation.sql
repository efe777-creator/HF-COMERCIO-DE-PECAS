-- F7C: separação por item

alter table public.order_items
  add column if not exists separated boolean not null default false;

create or replace function public.set_order_item_separated(
  p_order_item_id uuid,
  p_separated boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_item public.order_items%rowtype;
  v_order public.orders%rowtype;
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Somente staff' using errcode = '42501';
  end if;

  select * into v_item from public.order_items where id = p_order_item_id for update;
  if not found then
    raise exception 'Item nao encontrado' using errcode = 'P0001';
  end if;

  select * into v_order from public.orders where id = v_item.order_id;
  if v_order.status not in ('confirmado', 'em_separacao') then
    raise exception 'Pedido nao esta em separacao' using errcode = 'P0001';
  end if;

  if v_order.status = 'confirmado' then
    perform public.transition_order_status(
      v_order.id, 'em_separacao', 'Separacao iniciada',
      'separation_started', 'customer', '{}'::jsonb
    );
  end if;

  update public.order_items set separated = p_separated where id = p_order_item_id;

  perform public.emit_order_event(
    v_item.order_id, 'item_separated', 'internal',
    jsonb_build_object('order_item_id', p_order_item_id, 'sku', v_item.sku, 'separated', p_separated),
    v_uid
  );

  return jsonb_build_object('order_item_id', p_order_item_id, 'separated', p_separated);
end;
$$;

create or replace function public.complete_order_separation(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders%rowtype;
  v_pending int;
  v_tr jsonb;
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Somente staff' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  if v_order.status = 'confirmado' then
    perform public.transition_order_status(
      p_order_id, 'em_separacao', 'Separacao iniciada',
      'separation_started', 'customer', '{}'::jsonb
    );
    select * into v_order from public.orders where id = p_order_id;
  end if;

  if v_order.status <> 'em_separacao' then
    raise exception 'Pedido nao esta em_separacao' using errcode = 'P0001';
  end if;

  select count(*)::int into v_pending
  from public.order_items
  where order_id = p_order_id and separated is not true;

  if v_pending > 0 then
    raise exception 'Ainda ha % item(ns) sem separar', v_pending using errcode = 'P0001';
  end if;

  v_tr := public.transition_order_status(
    p_order_id, 'pronto_para_envio', 'Separacao concluida',
    'separation_completed', 'customer', '{}'::jsonb
  );

  return jsonb_build_object('order_id', p_order_id, 'status', 'pronto_para_envio', 'transition', v_tr);
end;
$$;

revoke all on function public.set_order_item_separated(uuid, boolean) from public;
revoke all on function public.complete_order_separation(uuid) from public;
grant execute on function public.set_order_item_separated(uuid, boolean) to authenticated;
grant execute on function public.complete_order_separation(uuid) to authenticated;
