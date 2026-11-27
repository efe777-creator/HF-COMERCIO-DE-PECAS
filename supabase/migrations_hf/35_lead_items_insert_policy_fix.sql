-- lead_items INSERT: EXISTS em leads falhava para anon (sem SELECT). FK garante lead_id.

drop policy if exists lead_items_anon_insert on public.lead_items;
create policy lead_items_anon_insert on public.lead_items
  for insert
  with check (true);
