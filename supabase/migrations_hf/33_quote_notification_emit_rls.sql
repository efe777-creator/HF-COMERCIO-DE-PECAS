-- HF: permitir emit de cotação (anon/auth) só nos kinds quote_* — sem Graph API.

drop policy if exists app_notifications_quote_emit on public.app_notifications;
create policy app_notifications_quote_emit
  on public.app_notifications
  for insert
  to anon, authenticated
  with check (kind in ('quote_requested', 'quote_sent'));

drop policy if exists notification_deliveries_quote_emit on public.notification_deliveries;
create policy notification_deliveries_quote_emit
  on public.notification_deliveries
  for insert
  to anon, authenticated
  with check (kind in ('quote_requested', 'quote_sent'));

grant insert on public.app_notifications to anon, authenticated;
grant insert on public.notification_deliveries to anon, authenticated;
