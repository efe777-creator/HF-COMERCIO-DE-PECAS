-- F7D: expedição manual

alter table public.shipments
  add column if not exists carrier text;

alter table public.shipments
  add column if not exists service text;

alter table public.shipments
  add column if not exists shipped_at timestamptz;

create or replace function public.ship_order(
  p_order_id uuid,
  p_carrier text default null,
  p_service text default null,
  p_tracking_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders%rowtype;
  v_tr jsonb;
  v_updated int;
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Somente staff' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  if v_order.status not in ('pronto_para_envio', 'preparando_envio') then
    raise exception 'Pedido nao esta pronto para envio' using errcode = 'P0001';
  end if;

  v_tr := public.transition_order_status(
    p_order_id, 'enviado', 'Pedido expedido',
    'order_shipped', 'customer',
    jsonb_build_object(
      'carrier', p_carrier,
      'service', p_service,
      'tracking_code', p_tracking_code
    )
  );

  update public.shipments
  set
    carrier = nullif(trim(coalesce(p_carrier, '')), ''),
    service = nullif(trim(coalesce(p_service, '')), ''),
    tracking_code = nullif(trim(coalesce(p_tracking_code, '')), ''),
    shipped_at = now(),
    status = 'shipped',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'carrier', p_carrier,
      'service', p_service,
      'shipped_by', v_uid
    )
  where order_id = p_order_id;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    insert into public.shipments (order_id, provider, status, tracking_code, amount, metadata, carrier, service, shipped_at)
    values (
      p_order_id,
      coalesce(nullif(trim(coalesce(p_carrier, '')), ''), 'manual'),
      'shipped',
      nullif(trim(coalesce(p_tracking_code, '')), ''),
      0,
      jsonb_build_object('service', p_service, 'shipped_by', v_uid),
      nullif(trim(coalesce(p_carrier, '')), ''),
      nullif(trim(coalesce(p_service, '')), ''),
      now()
    );
  end if;

  return jsonb_build_object('order_id', p_order_id, 'status', 'enviado', 'transition', v_tr);
end;
$$;

revoke all on function public.ship_order(uuid, text, text, text) from public;
grant execute on function public.ship_order(uuid, text, text, text) to authenticated;
