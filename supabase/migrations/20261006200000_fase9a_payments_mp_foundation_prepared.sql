-- F9-A — Fundação pagamentos Mercado Pago (prepared / idempotente).
-- Estende public.payments + cria public.payment_events.
-- NÃO altera place_order / confirm_simulated_payment / inventário.
-- Compat: provider='simulated' e status='failed' (legado) permanecem válidos.

-- ---------------------------------------------------------------------------
-- payments: colunas MP / auditoria
-- ---------------------------------------------------------------------------
alter table public.payments
  add column if not exists provider_payment_id text,
  add column if not exists provider_order_id text,
  add column if not exists method text,
  add column if not exists currency text not null default 'BRL',
  add column if not exists installments int,
  add column if not exists pix_qr_code text,
  add column if not exists pix_qr_code_base64 text,
  add column if not exists payment_url text,
  add column if not exists provider_status text,
  add column if not exists expires_at timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

comment on column public.payments.provider is
  'Provedor: simulated | mercadopago | …';
comment on column public.payments.status is
  'Interno: created|pending|approved|rejected|cancelled|expired|refunded (+ failed legado simulated)';
comment on column public.payments.provider_payment_id is
  'ID do pagamento no provedor (ex.: Mercado Pago payment id)';
comment on column public.payments.provider_order_id is
  'ID de order/preference no provedor, quando aplicável';
comment on column public.payments.method is
  'Meio: pix | credit_card | debit_card | pix_simulated | card_simulated | …';
comment on column public.payments.provider_status is
  'Status original do provedor (auditoria); não confundir com status interno';
comment on column public.payments.pix_qr_code is
  'Pix copia-e-cola (sem dados de cartão)';
comment on column public.payments.pix_qr_code_base64 is
  'QR Code Pix em base64 (imagem), se fornecido pelo provedor';

-- Constraint frouxa de method (nullable = legado)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'payments_method_check'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments
      add constraint payments_method_check
      check (
        method is null
        or method in (
          'pix',
          'credit_card',
          'debit_card',
          'pix_simulated',
          'card_simulated',
          'other'
        )
      );
  end if;
end $$;

-- Status: permitir legado failed + estados F9
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'payments_status_check'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments
      add constraint payments_status_check
      check (
        status in (
          'created',
          'pending',
          'approved',
          'rejected',
          'failed',
          'cancelled',
          'expired',
          'refunded'
        )
      );
  end if;
end $$;

create index if not exists payments_order_id_idx on public.payments (order_id);
create index if not exists payments_provider_payment_id_idx
  on public.payments (provider, provider_payment_id)
  where provider_payment_id is not null;
create index if not exists payments_status_idx on public.payments (status);

-- updated_at trigger
create or replace function public.set_payments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at
  before update on public.payments
  for each row
  execute function public.set_payments_updated_at();

-- ---------------------------------------------------------------------------
-- payment_events: ledger de webhooks / auditoria
-- ---------------------------------------------------------------------------
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments (id) on delete set null,
  provider text not null,
  provider_event_id text,
  event_type text,
  action text,
  payload jsonb,
  processed boolean not null default false,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

comment on table public.payment_events is
  'F9-A: eventos de pagamento (webhooks/auditoria). Sem dados sensíveis de cartão.';

create unique index if not exists payment_events_provider_event_uidx
  on public.payment_events (provider, provider_event_id)
  where provider_event_id is not null;

create index if not exists payment_events_payment_id_idx
  on public.payment_events (payment_id);

create index if not exists payment_events_created_at_idx
  on public.payment_events (created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.payment_events enable row level security;

drop policy if exists payment_events_select_own on public.payment_events;
create policy payment_events_select_own on public.payment_events
  for select using (
    public.is_staff()
    or exists (
      select 1
      from public.payments p
      join public.orders o on o.id = p.order_id
      where p.id = payment_events.payment_id
        and o.customer_id = public.current_customer_id()
    )
  );

-- Escrita: somente staff (Edge/service role bypassa RLS).
-- Customer NÃO atualiza payments.status nem grava eventos.
drop policy if exists payment_events_staff_write on public.payment_events;
create policy payment_events_staff_write on public.payment_events
  for all using (public.is_staff()) with check (public.is_staff());

-- Reforço: payments_staff_write já limita write a staff.
-- Garantir que não exista policy de update para customer (não há grants UPDATE).
revoke insert, update, delete on public.payments from authenticated;
revoke insert, update, delete on public.payment_events from authenticated;
grant select on public.payment_events to authenticated;

comment on table public.payments is
  'Pagamentos do pedido. Status financeiro só via backend (RPC security definer / Edge). Customer: SELECT próprio.';
