-- HF Andar 1: condições de pagamento (agenda + meios ±). Sem pedidos/títulos/gateway.
-- Aplicar no remoto só com autorização explícita.

create table if not exists public.payment_conditions (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text,
  footnote text,
  schedule_mode text not null default 'single'
    check (schedule_mode in ('single', 'equal_interval', 'custom_offsets', 'weekday_cycle')),
  anchor_kind text not null default 'document_date'
    check (anchor_kind in ('document_date')),
  installment_count int not null default 1 check (installment_count >= 1 and installment_count <= 48),
  equal_interval_days int check (equal_interval_days is null or equal_interval_days >= 0),
  first_due_days int not null default 0 check (first_due_days >= 0),
  weekday smallint check (weekday is null or (weekday >= 0 and weekday <= 6)),
  weekday_interval_weeks int check (weekday_interval_weeks is null or weekday_interval_weeks >= 1),
  amount_split text not null default 'equal'
    check (amount_split in ('equal', 'custom_percent')),
  business_day_rule text not null default 'none'
    check (business_day_rule in ('none', 'next_business', 'prev_business')),
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  min_subtotal numeric(12, 2) check (min_subtotal is null or min_subtotal >= 0),
  show_to_guests boolean not null default false,
  show_to_customers boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_conditions_code_unique unique (code)
);

create index if not exists payment_conditions_status_idx on public.payment_conditions (status);
create index if not exists payment_conditions_sort_idx on public.payment_conditions (sort_order, name);

comment on table public.payment_conditions is
  'Template de condição de pagamento (agenda + liberação). Sem títulos.';

create table if not exists public.payment_condition_installments (
  id uuid primary key default gen_random_uuid(),
  payment_condition_id uuid not null references public.payment_conditions (id) on delete cascade,
  seq int not null check (seq >= 1),
  offset_days int not null default 0 check (offset_days >= 0),
  percent numeric(8, 4) check (percent is null or (percent >= 0 and percent <= 100)),
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_condition_installments_unique unique (payment_condition_id, seq)
);

create index if not exists payment_condition_installments_cond_idx
  on public.payment_condition_installments (payment_condition_id, seq);

create table if not exists public.payment_condition_methods (
  id uuid primary key default gen_random_uuid(),
  payment_condition_id uuid not null references public.payment_conditions (id) on delete cascade,
  method text not null
    check (method in ('pix', 'debit', 'credit', 'boleto', 'cash')),
  enabled boolean not null default false,
  adjust_kind text not null default 'none'
    check (adjust_kind in ('none', 'percent', 'fixed')),
  adjust_sign text not null default 'surcharge'
    check (adjust_sign in ('surcharge', 'discount')),
  adjust_value numeric(12, 4) not null default 0 check (adjust_value >= 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_condition_methods_unique unique (payment_condition_id, method)
);

create index if not exists payment_condition_methods_cond_idx
  on public.payment_condition_methods (payment_condition_id, sort_order);

alter table public.customer_groups
  add column if not exists default_payment_condition_id uuid
    references public.payment_conditions (id) on delete set null;

create index if not exists customer_groups_default_payment_condition_idx
  on public.customer_groups (default_payment_condition_id)
  where default_payment_condition_id is not null;

-- updated_at
create or replace function public.set_updated_at_payment_finance()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists payment_conditions_set_updated_at on public.payment_conditions;
create trigger payment_conditions_set_updated_at
  before update on public.payment_conditions
  for each row execute function public.set_updated_at_payment_finance();

drop trigger if exists payment_condition_installments_set_updated_at on public.payment_condition_installments;
create trigger payment_condition_installments_set_updated_at
  before update on public.payment_condition_installments
  for each row execute function public.set_updated_at_payment_finance();

drop trigger if exists payment_condition_methods_set_updated_at on public.payment_condition_methods;
create trigger payment_condition_methods_set_updated_at
  before update on public.payment_condition_methods
  for each row execute function public.set_updated_at_payment_finance();

-- RLS
alter table public.payment_conditions enable row level security;
alter table public.payment_condition_installments enable row level security;
alter table public.payment_condition_methods enable row level security;

drop policy if exists payment_conditions_staff_all on public.payment_conditions;
create policy payment_conditions_staff_all on public.payment_conditions
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists payment_conditions_anon_read on public.payment_conditions;
create policy payment_conditions_anon_read on public.payment_conditions
  for select to anon
  using (status = 'published' and show_to_guests = true);

drop policy if exists payment_conditions_customer_read on public.payment_conditions;
create policy payment_conditions_customer_read on public.payment_conditions
  for select to authenticated
  using (
    public.is_staff()
    or (
      status = 'published'
      and show_to_customers = true
    )
  );

drop policy if exists payment_condition_installments_staff on public.payment_condition_installments;
create policy payment_condition_installments_staff on public.payment_condition_installments
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists payment_condition_installments_read on public.payment_condition_installments;
create policy payment_condition_installments_read on public.payment_condition_installments
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.payment_conditions c
      where c.id = payment_condition_id
        and (
          public.is_staff()
          or (c.status = 'published' and c.show_to_guests = true and (select auth.role()) = 'anon')
          or (c.status = 'published' and c.show_to_customers = true)
        )
    )
  );

drop policy if exists payment_condition_methods_staff on public.payment_condition_methods;
create policy payment_condition_methods_staff on public.payment_condition_methods
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists payment_condition_methods_read on public.payment_condition_methods;
create policy payment_condition_methods_read on public.payment_condition_methods
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.payment_conditions c
      where c.id = payment_condition_id
        and (
          public.is_staff()
          or (c.status = 'published' and c.show_to_guests = true and (select auth.role()) = 'anon')
          or (c.status = 'published' and c.show_to_customers = true)
        )
    )
  );

-- Seeds (published leves para smoke / conversão)
insert into public.payment_conditions (
  code, name, description, schedule_mode, installment_count, first_due_days,
  status, show_to_guests, show_to_customers, sort_order
) values
  ('AVISTA', 'À vista', 'Pagamento na data do documento', 'single', 1, 0, 'published', true, true, 10),
  ('28DDL', '28 dias', 'Vencimento em 28 dias', 'single', 1, 28, 'published', true, true, 20),
  ('15_15_3X', '3x a cada 15 dias', 'Três parcelas em intervalo igual', 'equal_interval', 3, 15, 'draft', false, true, 30),
  ('7_14', '7 / 14 dias', 'Duas parcelas em offsets custom', 'custom_offsets', 2, 0, 'draft', false, true, 40)
on conflict (code) do nothing;

-- Materializar parcelas dos seeds
insert into public.payment_condition_installments (payment_condition_id, seq, offset_days, percent)
select c.id, 1, c.first_due_days, 100
from public.payment_conditions c
where c.code in ('AVISTA', '28DDL')
  and not exists (
    select 1 from public.payment_condition_installments i where i.payment_condition_id = c.id
  );

insert into public.payment_condition_installments (payment_condition_id, seq, offset_days, percent)
select c.id, s.seq, c.first_due_days + (s.seq - 1) * coalesce(c.equal_interval_days, 15), round(100.0 / 3, 4)
from public.payment_conditions c
cross join (values (1), (2), (3)) as s(seq)
where c.code = '15_15_3X'
  and not exists (
    select 1 from public.payment_condition_installments i where i.payment_condition_id = c.id
  );

-- equal_interval_days for 15_15
update public.payment_conditions set equal_interval_days = 15 where code = '15_15_3X' and equal_interval_days is null;

insert into public.payment_condition_installments (payment_condition_id, seq, offset_days, percent)
select c.id, s.seq, s.days, 50
from public.payment_conditions c
cross join (values (1, 7), (2, 14)) as s(seq, days)
where c.code = '7_14'
  and not exists (
    select 1 from public.payment_condition_installments i where i.payment_condition_id = c.id
  );

-- Meios padrão nos seeds publicados
insert into public.payment_condition_methods (
  payment_condition_id, method, enabled, adjust_kind, adjust_sign, adjust_value, sort_order
)
select c.id, m.method, m.enabled, m.adjust_kind, m.adjust_sign, m.adjust_value, m.sort_order
from public.payment_conditions c
cross join (
  values
    ('pix', true, 'percent', 'discount', 2::numeric, 10),
    ('debit', true, 'none', 'surcharge', 0::numeric, 20),
    ('credit', true, 'percent', 'surcharge', 2.99::numeric, 30),
    ('boleto', true, 'none', 'surcharge', 0::numeric, 40),
    ('cash', true, 'none', 'surcharge', 0::numeric, 50)
) as m(method, enabled, adjust_kind, adjust_sign, adjust_value, sort_order)
where c.code in ('AVISTA', '28DDL')
on conflict (payment_condition_id, method) do nothing;
