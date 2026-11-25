-- HF: condições de pagamento por cliente (N:N).
-- Se o cliente não tiver vínculo, o app libera só AVISTA (À vista).
-- Aplicar no remoto só com autorização explícita (ou via MCP apply_migration).

create table if not exists public.customer_payment_conditions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  payment_condition_id uuid not null references public.payment_conditions (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint customer_payment_conditions_unique unique (customer_id, payment_condition_id)
);

create index if not exists customer_payment_conditions_customer_idx
  on public.customer_payment_conditions (customer_id);

create index if not exists customer_payment_conditions_condition_idx
  on public.customer_payment_conditions (payment_condition_id);

comment on table public.customer_payment_conditions is
  'Condições liberadas por cliente B2B. Vazio = só À vista (AVISTA) no app.';

alter table public.customer_payment_conditions enable row level security;

drop policy if exists customer_payment_conditions_select on public.customer_payment_conditions;
create policy customer_payment_conditions_select on public.customer_payment_conditions
  for select to authenticated
  using (
    public.is_staff()
    or customer_id in (select public.current_customer_ids())
  );

drop policy if exists customer_payment_conditions_write_staff on public.customer_payment_conditions;
create policy customer_payment_conditions_write_staff on public.customer_payment_conditions
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

grant select, insert, update, delete on public.customer_payment_conditions to authenticated;
