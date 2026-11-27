-- HF Jornada Comercial (Andar 1): sellers, FKs leads/customers, auditoria, kinds.
-- Additive only. Preserva policies insert públicas de leads/lead_items.
-- Nome 40_* evita colisão dos prefixos 32–35 duplicados no repo.

-- ---------------------------------------------------------------------------
-- sellers
-- ---------------------------------------------------------------------------
create table if not exists public.sellers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp text,
  email text,
  phone text,
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sellers_status_idx on public.sellers (status);
create index if not exists sellers_profile_id_idx on public.sellers (profile_id)
  where profile_id is not null;

comment on table public.sellers is
  'Vendedores comerciais HF — distinto de profiles/operadores. Soft-inactivate; sem delete com vínculos.';

alter table public.sellers enable row level security;

drop policy if exists sellers_staff_select on public.sellers;
create policy sellers_staff_select on public.sellers
  for select to authenticated
  using (public.is_staff());

drop policy if exists sellers_staff_insert on public.sellers;
create policy sellers_staff_insert on public.sellers
  for insert to authenticated
  with check (public.is_staff());

drop policy if exists sellers_staff_update on public.sellers;
create policy sellers_staff_update on public.sellers
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Sem policy DELETE: exclusão física bloqueada na app; RESTRICT nas FKs.
grant select, insert, update on public.sellers to authenticated;

-- Picker público: só id, name, whatsapp de ativos (RLS não mascara colunas).
create or replace function public.list_active_sellers_public()
returns table (id uuid, name text, whatsapp text)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.name, s.whatsapp
  from public.sellers s
  where s.status = 'active'
  order by s.name;
$$;

revoke all on function public.list_active_sellers_public() from public;
grant execute on function public.list_active_sellers_public() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- customers.default_seller_id
-- ---------------------------------------------------------------------------
alter table public.customers
  add column if not exists default_seller_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'customers_default_seller_id_fkey'
  ) then
    alter table public.customers
      add constraint customers_default_seller_id_fkey
      foreign key (default_seller_id) references public.sellers (id)
      on delete restrict;
  end if;
end $$;

create index if not exists customers_default_seller_id_idx
  on public.customers (default_seller_id)
  where default_seller_id is not null;

-- ---------------------------------------------------------------------------
-- leads extensions
-- ---------------------------------------------------------------------------
alter table public.leads
  add column if not exists customer_id uuid,
  add column if not exists recipient_seller_id uuid,
  add column if not exists close_reason text,
  add column if not exists closed_at timestamptz,
  add column if not exists forwarded_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejected_by uuid,
  add column if not exists rejection_reason text,
  add column if not exists business_profile text,
  add column if not exists interest text,
  add column if not exists attribution jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'leads_customer_id_fkey'
  ) then
    alter table public.leads
      add constraint leads_customer_id_fkey
      foreign key (customer_id) references public.customers (id)
      on delete set null;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'leads_recipient_seller_id_fkey'
  ) then
    alter table public.leads
      add constraint leads_recipient_seller_id_fkey
      foreign key (recipient_seller_id) references public.sellers (id)
      on delete restrict;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'leads_rejected_by_fkey'
  ) then
    alter table public.leads
      add constraint leads_rejected_by_fkey
      foreign key (rejected_by) references public.profiles (id)
      on delete set null;
  end if;
end $$;

create index if not exists leads_customer_id_idx on public.leads (customer_id)
  where customer_id is not null;
create index if not exists leads_recipient_seller_id_idx on public.leads (recipient_seller_id)
  where recipient_seller_id is not null;

-- ---------------------------------------------------------------------------
-- commercial_events (auditoria leve)
-- ---------------------------------------------------------------------------
create table if not exists public.commercial_events (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  actor_profile_id uuid references public.profiles (id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  before_json jsonb,
  after_json jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists commercial_events_entity_idx
  on public.commercial_events (entity_type, entity_id, created_at desc);

comment on table public.commercial_events is
  'Auditoria leve jornada comercial — não é CRM.';

alter table public.commercial_events enable row level security;

drop policy if exists commercial_events_staff_select on public.commercial_events;
create policy commercial_events_staff_select on public.commercial_events
  for select to authenticated
  using (public.is_staff());

drop policy if exists commercial_events_staff_insert on public.commercial_events;
create policy commercial_events_staff_insert on public.commercial_events
  for insert to authenticated
  with check (public.is_staff());

grant select, insert on public.commercial_events to authenticated;

-- ---------------------------------------------------------------------------
-- notification kinds (jornada)
-- ---------------------------------------------------------------------------
insert into public.notification_kind_catalog as c (
  kind, notify_customer, notify_staff, severity, actionable, enabled, channels, category,
  title_template, body_template, href_template
) values
  (
    'request_received', false, true, 'acao_necessaria', true, true,
    array['in_app']::text[], 'comercial',
    'Nova solicitação comercial',
    'Há uma solicitação comercial na fila.',
    '/admin/pedidos/solicitacoes'
  ),
  (
    'request_complement', true, false, 'acao_necessaria', true, true,
    array['in_app']::text[], 'comercial',
    'Complete seus dados',
    'A HF pediu informações complementares do cadastro.',
    '/conta'
  ),
  (
    'access_rejected', true, false, 'importante', true, true,
    array['in_app']::text[], 'acesso',
    'Solicitação não aprovada',
    'Sua solicitação comercial não foi aprovada. Fale com a HF se precisar.',
    '/conta/avisos'
  ),
  (
    'quote_forwarded', false, true, 'informativa', true, true,
    array['in_app']::text[], 'comercial',
    'Cotação encaminhada',
    'Uma cotação foi encaminhada a um vendedor.',
    '/admin/pedidos/cotacoes'
  ),
  (
    'quote_closed', false, true, 'informativa', false, true,
    array['in_app']::text[], 'comercial',
    'Cotação encerrada',
    'Uma cotação foi encerrada manualmente.',
    '/admin/pedidos/cotacoes'
  )
on conflict (kind) do update set
  notify_customer = excluded.notify_customer,
  notify_staff = excluded.notify_staff,
  severity = excluded.severity,
  actionable = excluded.actionable,
  enabled = excluded.enabled,
  channels = excluded.channels,
  category = excluded.category,
  title_template = excluded.title_template,
  body_template = excluded.body_template,
  href_template = excluded.href_template,
  updated_at = now();
