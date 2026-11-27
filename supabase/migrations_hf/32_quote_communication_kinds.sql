-- HF: kinds de cotação na Central de Comunicação (Andar 1 cesta).

insert into public.notification_kind_catalog as c (
  kind, notify_customer, notify_staff, severity, actionable, enabled, channels, category,
  title_template, body_template, href_template
) values
  (
    'quote_requested', false, true, 'acao_necessaria', true, true,
    array['in_app']::text[], 'comercial',
    'Nova cotação recebida',
    'Há uma solicitação de cotação na fila comercial.',
    '/admin/cotacoes'
  ),
  (
    'quote_sent', true, false, 'informativa', false, true,
    array['in_app']::text[], 'comercial',
    'Cotação enviada',
    'Recebemos sua solicitação de cotação. O time comercial retorna em breve.',
    '/conta/avisos'
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
