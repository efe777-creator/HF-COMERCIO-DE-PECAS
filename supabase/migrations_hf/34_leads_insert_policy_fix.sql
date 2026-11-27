-- Corrige INSERT público de leads/cotação (policy sem TO roles quebrava anon).

drop policy if exists leads_anon_insert on public.leads;
create policy leads_anon_insert on public.leads
  for insert
  with check (true);

drop policy if exists lead_items_anon_insert on public.lead_items;
create policy lead_items_anon_insert on public.lead_items
  for insert
  with check (
    exists (
      select 1 from public.leads l
      where l.id = lead_id
    )
  );
