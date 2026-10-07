-- Fase 7A — Fundação do ciclo de pedidos (status F6D + order_events + transições)

-- ---------------------------------------------------------------------------
-- 1) Ampliar CHECK de orders.status
-- ---------------------------------------------------------------------------
alter table public.orders drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check check (status in (
    'pendente',
    'aguardando_pagamento',
    'pagamento_aprovado',
    'recebido',
    'em_analise',
    'aguardando_disponibilidade',
    'aguardando_decisao',
    'confirmado',
    'em_separacao',
    'pronto_para_envio',
    'preparando_envio', -- legado (equivale a pronto_para_envio)
    'enviado',
    'entregue',
    'cancelado'
  ));

-- Backfill legado → modelo F6D
update public.orders set status = 'pronto_para_envio', updated_at = now()
where status = 'preparando_envio';

update public.orders set status = 'em_analise', updated_at = now()
where status = 'pagamento_aprovado';

-- ---------------------------------------------------------------------------
-- 2) order_events
-- ---------------------------------------------------------------------------
create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  visibility text not null default 'internal'
    check (visibility in ('internal', 'customer')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists order_events_order_id_created_at_idx
  on public.order_events (order_id, created_at);

alter table public.order_events enable row level security;

drop policy if exists order_events_select_own_customer on public.order_events;
create policy order_events_select_own_customer on public.order_events
  for select to authenticated
  using (
    visibility = 'customer'
    and exists (
      select 1 from public.orders o
      join public.customers c on c.id = o.customer_id
      where o.id = order_events.order_id and c.profile_id = auth.uid()
    )
  );

drop policy if exists order_events_select_staff on public.order_events;
create policy order_events_select_staff on public.order_events
  for select to authenticated
  using (public.is_staff());

-- inserts via SECURITY DEFINER only
revoke insert, update, delete on public.order_events from authenticated, anon;
grant select on public.order_events to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Helpers
-- ---------------------------------------------------------------------------
create or replace function public.emit_order_event(
  p_order_id uuid,
  p_event_type text,
  p_visibility text default 'internal',
  p_payload jsonb default '{}'::jsonb,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_visibility not in ('internal', 'customer') then
    raise exception 'visibility inválida' using errcode = 'P0001';
  end if;

  insert into public.order_events (order_id, event_type, payload, visibility, created_by)
  values (p_order_id, p_event_type, coalesce(p_payload, '{}'::jsonb), p_visibility, p_created_by)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.emit_order_event(uuid, text, text, jsonb, uuid) from public;

create or replace function public.order_transition_allowed(
  p_from text,
  p_to text
)
returns boolean
language sql
immutable
as $$
  select case
    when p_from = p_to then false
    when p_from = 'pagamento_aprovado' and p_to = 'recebido' then true
    when p_from = 'recebido' and p_to = 'em_analise' then true
    when p_from = 'em_analise' and p_to in (
      'confirmado', 'aguardando_disponibilidade', 'aguardando_decisao'
    ) then true
    when p_from = 'aguardando_disponibilidade' and p_to in (
      'confirmado', 'aguardando_decisao', 'em_analise'
    ) then true
    when p_from = 'aguardando_decisao' and p_to in ('confirmado', 'cancelado') then true
    when p_from = 'confirmado' and p_to = 'em_separacao' then true
    when p_from = 'em_separacao' and p_to = 'pronto_para_envio' then true
    when p_from = 'pronto_para_envio' and p_to = 'enviado' then true
    when p_from = 'preparando_envio' and p_to = 'enviado' then true
    when p_from = 'enviado' and p_to = 'entregue' then true
    else false
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
    raise exception 'Não autenticado' using errcode = '42501';
  end if;

  if not public.is_staff() then
    raise exception 'Somente staff pode alterar status operacional' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido não encontrado' using errcode = 'P0001';
  end if;

  v_from := v_order.status;

  if not public.order_transition_allowed(v_from, p_to_status) then
    raise exception 'Transição inválida: % → %', v_from, p_to_status using errcode = 'P0001';
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

revoke all on function public.transition_order_status(uuid, text, text, text, text, jsonb) from public;
grant execute on function public.transition_order_status(uuid, text, text, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) confirm_simulated_payment → aprova + entra no ciclo FAL
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
    perform public.emit_order_event(
      v_order.id, 'payment_approved', 'customer',
      jsonb_build_object('payment_id', v_pay.id), v_uid
    );

    update public.orders set status = 'recebido', updated_at = now() where id = v_order.id;
    insert into public.order_status_history (order_id, status, note, changed_by)
    values (v_order.id, 'recebido', 'Pedido recebido pela FAL', v_uid);
    perform public.emit_order_event(
      v_order.id, 'order_received', 'customer',
      '{}'::jsonb, v_uid
    );

    update public.orders set status = 'em_analise', updated_at = now() where id = v_order.id;
    insert into public.order_status_history (order_id, status, note, changed_by)
    values (v_order.id, 'em_analise', 'Pedido em confirmação', v_uid);
    perform public.emit_order_event(
      v_order.id, 'confirmation_started', 'internal',
      '{}'::jsonb, v_uid
    );

    return jsonb_build_object(
      'payment_id', v_pay.id,
      'provider', 'simulated',
      'status', 'approved',
      'external_ref', v_pay.external_ref,
      'amount', v_pay.amount,
      'order_id', v_order.id,
      'order_status', 'em_analise'
    );
  end if;

  update public.payments set status = 'failed' where id = v_pay.id;
  perform public.release_order_reservations(v_order.id);
  update public.orders set status = 'cancelado', updated_at = now() where id = v_order.id;
  update public.shipments set status = 'cancelled' where order_id = v_order.id;
  insert into public.order_status_history (order_id, status, note, changed_by)
  values (v_order.id, 'cancelado', 'Pagamento simulado recusado — reserva liberada', v_uid);
  perform public.emit_order_event(
    v_order.id, 'payment_failed', 'customer',
    jsonb_build_object('payment_id', v_pay.id), v_uid
  );
  perform public.emit_order_event(
    v_order.id, 'order_cancelled', 'customer',
    jsonb_build_object('reason', 'payment_failed'), v_uid
  );

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

-- ---------------------------------------------------------------------------
-- 5) Seed eventos customer a partir do history (best-effort)
-- ---------------------------------------------------------------------------
insert into public.order_events (order_id, event_type, payload, visibility, created_by, created_at)
select
  h.order_id,
  case h.status
    when 'aguardando_pagamento' then 'order_created'
    when 'pagamento_aprovado' then 'payment_approved'
    when 'recebido' then 'order_received'
    when 'em_analise' then 'confirmation_started'
    when 'confirmado' then 'order_confirmed'
    when 'em_separacao' then 'separation_started'
    when 'pronto_para_envio' then 'separation_completed'
    when 'enviado' then 'order_shipped'
    when 'entregue' then 'order_delivered'
    when 'cancelado' then 'order_cancelled'
    else 'status_changed'
  end,
  jsonb_build_object('status', h.status, 'note', h.note, 'legacy_history', true),
  case
    when h.status in (
      'aguardando_pagamento', 'pagamento_aprovado', 'recebido',
      'confirmado', 'em_separacao', 'enviado', 'entregue', 'cancelado'
    ) then 'customer'
    else 'internal'
  end,
  h.changed_by,
  h.created_at
from public.order_status_history h
where not exists (
  select 1 from public.order_events e
  where e.order_id = h.order_id
    and e.payload->>'legacy_history' = 'true'
    and e.payload->>'status' = h.status
    and e.created_at = h.created_at
);

-- ---------------------------------------------------------------------------
-- 6) Trigger: order_created em novos pedidos
-- ---------------------------------------------------------------------------
create or replace function public.trg_orders_emit_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.emit_order_event(
    new.id,
    'order_created',
    'customer',
    jsonb_build_object('status', new.status),
    auth.uid()
  );
  return new;
end;
$$;

drop trigger if exists orders_emit_created on public.orders;
create trigger orders_emit_created
  after insert on public.orders
  for each row
  execute function public.trg_orders_emit_created();
