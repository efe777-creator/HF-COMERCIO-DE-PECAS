-- HF: anon/auth pode emitir request_received (cadastro comercial público).

drop policy if exists app_notifications_quote_emit on public.app_notifications;
create policy app_notifications_quote_emit
  on public.app_notifications
  for insert
  to anon, authenticated
  with check (
    kind in (
      'quote_requested',
      'quote_sent',
      'request_received'
    )
  );

drop policy if exists notification_deliveries_quote_emit on public.notification_deliveries;
create policy notification_deliveries_quote_emit
  on public.notification_deliveries
  for insert
  to anon, authenticated
  with check (
    kind in (
      'quote_requested',
      'quote_sent',
      'request_received'
    )
  );
