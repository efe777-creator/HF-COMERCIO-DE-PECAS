-- HF: Central de Comunicação — avisos in-app (acesso B2B). Sem pedido / WhatsApp Graph.

create table if not exists public.notification_kind_catalog (
  kind text primary key,
  notify_customer boolean not null default false,
  notify_staff boolean not null default false,
  severity text not null default 'informativa'
    check (severity in ('informativa', 'importante', 'acao_necessaria', 'operacional')),
  actionable boolean not null default false,
  enabled boolean not null default true,
  channels text[] not null default array['in_app']::text[],
  category text not null default 'sistema'
    check (category in ('acesso', 'comercial', 'sistema')),
  title_template text not null,
  body_template text,
  href_template text not null default '/conta',
  updated_at timestamptz not null default now()
);

comment on table public.notification_kind_catalog is
  'HF comunicação: kinds ativos = acesso; order/quote desligados. Canais futuros: whatsapp.';

alter table public.notification_kind_catalog enable row level security;

drop policy if exists notification_kind_catalog_select_auth on public.notification_kind_catalog;
create policy notification_kind_catalog_select_auth
  on public.notification_kind_catalog
  for select to authenticated
  using (true);

drop policy if exists notification_kind_catalog_staff_write on public.notification_kind_catalog;
create policy notification_kind_catalog_staff_write
  on public.notification_kind_catalog
  for all
  using (public.is_staff())
  with check (public.is_staff());

insert into public.notification_kind_catalog as c (
  kind, notify_customer, notify_staff, severity, actionable, enabled, channels, category,
  title_template, body_template, href_template
) values
  (
    'access_pending', false, true, 'acao_necessaria', true, true,
    array['in_app']::text[], 'acesso',
    'Cliente aguardando liberação',
    'Há um cliente B2B com status pending. Revise e libere o acesso.',
    '/admin/clientes'
  ),
  (
    'access_granted', true, false, 'importante', false, true,
    array['in_app']::text[], 'acesso',
    'Acesso liberado',
    'Sua empresa foi liberada. Você já pode ver o catálogo autorizado.',
    '/conta'
  ),
  (
    'access_suspended', true, false, 'importante', true, true,
    array['in_app']::text[], 'acesso',
    'Acesso suspenso',
    'O acesso B2B da sua empresa foi suspenso. Fale com a HF se precisar de ajuda.',
    '/conta'
  ),
  (
    'quote_replied', true, false, 'informativa', false, false,
    array['in_app']::text[], 'comercial',
    'Resposta de cotação',
    'Há uma atualização na sua cotação.',
    '/conta'
  ),
  (
    'order_received', true, true, 'importante', false, false,
    array['in_app']::text[], 'comercial',
    'Pedido recebido',
    'Recebemos seu pedido.',
    '/conta'
  ),
  (
    'order_status', true, false, 'informativa', false, false,
    array['in_app']::text[], 'comercial',
    'Status do pedido',
    'O status do seu pedido mudou.',
    '/conta'
  ),
  (
    'payment_due', true, false, 'acao_necessaria', true, false,
    array['in_app']::text[], 'comercial',
    'Pagamento pendente',
    'Há um título ou condição a conferir.',
    '/conta'
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

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('customer', 'staff')),
  customer_id uuid null references public.customers (id) on delete cascade,
  profile_id uuid null references public.profiles (id) on delete cascade,
  kind text not null references public.notification_kind_catalog (kind),
  title text not null,
  body text,
  href text not null default '/conta',
  category text not null default 'sistema'
    check (category in ('acesso', 'comercial', 'sistema')),
  severity text not null default 'informativa'
    check (severity in ('informativa', 'importante', 'acao_necessaria', 'operacional')),
  actionable boolean not null default false,
  source_event_id uuid not null default gen_random_uuid(),
  read_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists app_notifications_profile_created_idx
  on public.app_notifications (profile_id, created_at desc)
  where profile_id is not null;

create index if not exists app_notifications_staff_unread_idx
  on public.app_notifications (audience, created_at desc)
  where audience = 'staff' and read_at is null;

create index if not exists app_notifications_customer_unread_idx
  on public.app_notifications (customer_id, created_at desc)
  where customer_id is not null and read_at is null;

alter table public.app_notifications enable row level security;

drop policy if exists app_notifications_staff_all on public.app_notifications;
create policy app_notifications_staff_all
  on public.app_notifications
  for all
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists app_notifications_customer_select on public.app_notifications;
create policy app_notifications_customer_select
  on public.app_notifications
  for select to authenticated
  using (
    audience = 'customer'
    and (
      profile_id = auth.uid()
      or exists (
        select 1 from public.customer_users cu
        where cu.customer_id = app_notifications.customer_id
          and cu.profile_id = auth.uid()
          and cu.status = 'active'
      )
    )
  );

drop policy if exists app_notifications_customer_mark_read on public.app_notifications;
create policy app_notifications_customer_mark_read
  on public.app_notifications
  for update to authenticated
  using (
    audience = 'customer'
    and (
      profile_id = auth.uid()
      or exists (
        select 1 from public.customer_users cu
        where cu.customer_id = app_notifications.customer_id
          and cu.profile_id = auth.uid()
          and cu.status = 'active'
      )
    )
  )
  with check (
    audience = 'customer'
    and (
      profile_id = auth.uid()
      or exists (
        select 1 from public.customer_users cu
        where cu.customer_id = app_notifications.customer_id
          and cu.profile_id = auth.uid()
          and cu.status = 'active'
      )
    )
  );

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  source_event_id uuid not null,
  notification_id uuid null references public.app_notifications (id) on delete set null,
  recipient_profile_id uuid null references public.profiles (id) on delete set null,
  customer_id uuid null references public.customers (id) on delete set null,
  channel text not null check (channel in ('in_app', 'whatsapp', 'email', 'push')),
  kind text not null,
  audience text not null check (audience in ('customer', 'staff')),
  status text not null default 'skipped'
    check (status in ('pending', 'sent', 'failed', 'skipped', 'read')),
  attempts integer not null default 0,
  last_error text null,
  provider_ref text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz null
);

create index if not exists notification_deliveries_event_idx
  on public.notification_deliveries (source_event_id);

create index if not exists notification_deliveries_status_idx
  on public.notification_deliveries (status, created_at desc);

alter table public.notification_deliveries enable row level security;

drop policy if exists notification_deliveries_staff_all on public.notification_deliveries;
create policy notification_deliveries_staff_all
  on public.notification_deliveries
  for all
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists notification_deliveries_select_own on public.notification_deliveries;
create policy notification_deliveries_select_own
  on public.notification_deliveries
  for select to authenticated
  using (
    recipient_profile_id = auth.uid()
    or public.is_staff()
  );

comment on table public.notification_deliveries is
  'HF: log por canal. in_app=sent; whatsapp/email/push = skipped neste andar.';
