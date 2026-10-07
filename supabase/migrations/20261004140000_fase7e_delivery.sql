-- F7E: entrega

alter table public.shipments
  add column if not exists delivered_at timestamptz;

alter table public.shipments
  add column if not exists proof_ref text;

create or replace function public.deliver_order(
  p_order_id uuid,
  p_proof_ref text default null
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
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Somente staff' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  if v_order.status <> 'enviado' then
    raise exception 'Pedido nao esta enviado' using errcode = 'P0001';
  end if;

  update public.shipments
  set
    delivered_at = now(),
    proof_ref = nullif(trim(coalesce(p_proof_ref, '')), ''),
    status = 'delivered',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('delivered_by', v_uid)
  where order_id = p_order_id;

  v_tr := public.transition_order_status(
    p_order_id, 'entregue', 'Pedido entregue',
    'order_delivered', 'customer',
    jsonb_build_object('proof_ref', p_proof_ref)
  );

  return jsonb_build_object('order_id', p_order_id, 'status', 'entregue', 'transition', v_tr);
end;
$$;

revoke all on function public.deliver_order(uuid, text) from public;
grant execute on function public.deliver_order(uuid, text) to authenticated;
