-- F7F: liberação no cancel + baixa na expedição

create or replace function public.fulfill_order_reservations(p_order_id uuid, p_user_id uuid default null)
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

create or replace function public.transition_order_status(
  p_order_id uuid,
  p_to_status text,
  p_note text default null,
  p_event_type text default null,
  p_event_visibility text default 'internal',
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders%rowtype;
  v_from text;
  v_evt text;
begin
  if v_uid is null then
    raise exception 'Nao autenticado' using errcode = '42501';
  end if;

  if not public.is_staff() then
    raise exception 'Somente staff pode alterar status operacional' using errcode = '42501';
  end if;

  if p_to_status = 'cancelado' and not public.staff_can_cancel() then
    raise exception 'Somente gerente ou administrador pode cancelar' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  v_from := v_order.status;

  if not public.order_transition_allowed(v_from, p_to_status) then
    raise exception 'Transicao invalida: % -> %', v_from, p_to_status using errcode = 'P0001';
  end if;

  -- F7F: baixa antes de marcar enviado (falha = sem mudança de status)
  if p_to_status = 'enviado' then
    perform public.fulfill_order_reservations(p_order_id, v_uid);
  end if;

  update public.orders
  set status = p_to_status, updated_at = now()
  where id = p_order_id;

  insert into public.order_status_history (order_id, status, note, changed_by)
  values (p_order_id, p_to_status, p_note, v_uid);

  -- F7F: liberar reserva no cancel administrativo
  if p_to_status = 'cancelado' then
    perform public.release_order_reservations(p_order_id);
  end if;

  v_evt := coalesce(p_event_type, 'status_changed');
  perform public.emit_order_event(
    p_order_id,
    v_evt,
    coalesce(p_event_visibility, 'internal'),
    coalesce(p_payload, '{}'::jsonb) || jsonb_build_object('from', v_from, 'to', p_to_status, 'note', p_note),
    v_uid
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'from', v_from,
    'to', p_to_status
  );
end;
$$;

revoke all on function public.fulfill_order_reservations(uuid, uuid) from public;
