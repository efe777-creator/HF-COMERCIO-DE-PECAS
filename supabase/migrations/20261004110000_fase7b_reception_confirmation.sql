-- F7B: recepção/confirmação — availability por item, RPCs, cancel gerente+, contadores

alter table public.order_items
  add column if not exists availability text
    check (availability is null or availability in ('disponivel', 'disponivel_com_prazo', 'indisponivel'));

alter table public.order_items
  add column if not exists lead_days integer
    check (lead_days is null or lead_days >= 0);

alter table public.order_items
  add column if not exists staff_note text;

create or replace function public.staff_can_cancel()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('administrador', 'gerente')
  );
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
    raise exception 'Transicao invalida: % → %', v_from, p_to_status using errcode = 'P0001';
  end if;

  update public.orders
  set status = p_to_status, updated_at = now()
  where id = p_order_id;

  insert into public.order_status_history (order_id, status, note, changed_by)
  values (p_order_id, p_to_status, p_note, v_uid);

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

create or replace function public.set_order_item_availability(
  p_order_item_id uuid,
  p_availability text,
  p_lead_days integer default null,
  p_staff_note text default null
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

  if p_availability is null or p_availability not in ('disponivel', 'disponivel_com_prazo', 'indisponivel') then
    raise exception 'Disponibilidade invalida' using errcode = 'P0001';
  end if;

  if p_availability = 'disponivel_com_prazo' and (p_lead_days is null or p_lead_days < 1) then
    raise exception 'Informe lead_days >= 1 para disponivel_com_prazo' using errcode = 'P0001';
  end if;

  select * into v_item from public.order_items where id = p_order_item_id for update;
  if not found then
    raise exception 'Item nao encontrado' using errcode = 'P0001';
  end if;

  select * into v_order from public.orders where id = v_item.order_id for update;
  if v_order.status not in ('recebido', 'em_analise', 'aguardando_disponibilidade', 'aguardando_decisao') then
    raise exception 'Pedido nao esta em fase de analise' using errcode = 'P0001';
  end if;

  if v_order.status = 'recebido' then
    perform public.transition_order_status(
      v_order.id, 'em_analise', 'Inicio da analise de disponibilidade',
      'analysis_started', 'customer', '{}'::jsonb
    );
  end if;

  update public.order_items
  set
    availability = p_availability,
    lead_days = case when p_availability = 'disponivel_com_prazo' then p_lead_days else null end,
    staff_note = nullif(trim(coalesce(p_staff_note, '')), '')
  where id = p_order_item_id;

  perform public.emit_order_event(
    v_item.order_id,
    'item_availability_set',
    'internal',
    jsonb_build_object(
      'order_item_id', p_order_item_id,
      'sku', v_item.sku,
      'availability', p_availability,
      'lead_days', p_lead_days,
      'staff_note', p_staff_note
    ),
    v_uid
  );

  return jsonb_build_object(
    'order_item_id', p_order_item_id,
    'availability', p_availability,
    'lead_days', case when p_availability = 'disponivel_com_prazo' then p_lead_days else null end
  );
end;
$$;

create or replace function public.finalize_order_confirmation(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders%rowtype;
  v_total int;
  v_set int;
  v_indisponivel int;
  v_prazo int;
  v_result text;
  v_to text;
  v_tr jsonb;
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Somente staff' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  if v_order.status = 'recebido' then
    perform public.transition_order_status(
      p_order_id, 'em_analise', 'Inicio da analise',
      'analysis_started', 'customer', '{}'::jsonb
    );
    select * into v_order from public.orders where id = p_order_id;
  end if;

  if v_order.status not in ('em_analise', 'aguardando_disponibilidade', 'aguardando_decisao') then
    raise exception 'Pedido nao esta em fase de confirmacao' using errcode = 'P0001';
  end if;

  select count(*)::int,
         count(*) filter (where availability is not null)::int,
         count(*) filter (where availability = 'indisponivel')::int,
         count(*) filter (where availability = 'disponivel_com_prazo')::int
  into v_total, v_set, v_indisponivel, v_prazo
  from public.order_items
  where order_id = p_order_id;

  if v_total = 0 then
    raise exception 'Pedido sem itens' using errcode = 'P0001';
  end if;

  if v_set < v_total then
    raise exception 'Defina disponibilidade de todos os itens' using errcode = 'P0001';
  end if;

  if v_indisponivel = v_total then
    v_result := 'nao_atendivel';
    v_to := 'aguardando_decisao';
  elsif v_indisponivel > 0 then
    v_result := 'nao_atendivel';
    v_to := 'aguardando_decisao';
  elsif v_prazo > 0 then
    v_result := 'com_ressalva';
    v_to := 'confirmado';
  else
    v_result := 'confirmado';
    v_to := 'confirmado';
  end if;

  if v_order.status = 'aguardando_decisao' and v_to = 'aguardando_decisao' then
    perform public.emit_order_event(
      p_order_id, 'confirmation_reviewed', 'internal',
      jsonb_build_object('result', v_result), v_uid
    );
    return jsonb_build_object('order_id', p_order_id, 'result', v_result, 'status', v_order.status);
  end if;

  if v_order.status <> v_to then
    -- aguardando_decisao -> confirmado e permitido; em_analise -> confirmado/aguardando_*
    if v_order.status = 'aguardando_decisao' and v_to = 'confirmado' then
      null;
    elsif v_order.status = 'em_analise' and v_to in ('confirmado', 'aguardando_decisao', 'aguardando_disponibilidade') then
      null;
    elsif not public.order_transition_allowed(v_order.status, v_to) then
      raise exception 'Transicao invalida na finalizacao: % → %', v_order.status, v_to using errcode = 'P0001';
    end if;

    v_tr := public.transition_order_status(
      p_order_id,
      v_to,
      case v_result
        when 'com_ressalva' then 'Confirmado com ressalva de prazo'
        when 'nao_atendivel' then 'Aguardando decisao — itens indisponiveis'
        else 'Pedido confirmado'
      end,
      case v_result
        when 'com_ressalva' then 'order_confirmed_with_caveat'
        when 'nao_atendivel' then 'order_awaiting_decision'
        else 'order_confirmed'
      end,
      case when v_result = 'nao_atendivel' then 'internal' else 'customer' end,
      jsonb_build_object('result', v_result, 'prazo_items', v_prazo, 'indisponivel_items', v_indisponivel)
    );
  end if;

  perform public.emit_order_event(
    p_order_id,
    'confirmation_finalized',
    'internal',
    jsonb_build_object('result', v_result, 'to', v_to),
    v_uid
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'result', v_result,
    'status', v_to,
    'transition', v_tr
  );
end;
$$;

create or replace function public.admin_order_status_counts()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_counts jsonb;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Somente staff' using errcode = '42501';
  end if;

  select coalesce(jsonb_object_agg(status, cnt), '{}'::jsonb)
  into v_counts
  from (
    select status, count(*)::int as cnt
    from public.orders
    group by status
  ) s;

  return v_counts;
end;
$$;

revoke all on function public.staff_can_cancel() from public;
revoke all on function public.set_order_item_availability(uuid, text, integer, text) from public;
revoke all on function public.finalize_order_confirmation(uuid) from public;
revoke all on function public.admin_order_status_counts() from public;

grant execute on function public.staff_can_cancel() to authenticated;
grant execute on function public.set_order_item_availability(uuid, text, integer, text) to authenticated;
grant execute on function public.finalize_order_confirmation(uuid) to authenticated;
grant execute on function public.admin_order_status_counts() to authenticated;
grant execute on function public.transition_order_status(uuid, text, text, text, text, jsonb) to authenticated;
