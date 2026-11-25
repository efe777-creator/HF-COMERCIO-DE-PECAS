-- HF: cliente B2B ativo lê a própria lista assigned (+ itens).
-- Sem isso, priceVisible nunca resolve (RLS só liberava scope=public).

drop policy if exists price_lists_customer_assigned_read on public.price_lists;
create policy price_lists_customer_assigned_read on public.price_lists
  for select to authenticated
  using (
    scope = 'assigned'
    and status = 'active'
    and exists (
      select 1
      from public.customers c
      where c.id in (select public.current_customer_ids())
        and c.status = 'active'
        and c.assigned_price_list_id = price_lists.id
    )
  );

drop policy if exists price_list_items_customer_assigned_read on public.price_list_items;
create policy price_list_items_customer_assigned_read on public.price_list_items
  for select to authenticated
  using (
    exists (
      select 1
      from public.price_lists pl
      join public.customers c on c.assigned_price_list_id = pl.id
      where pl.id = price_list_items.price_list_id
        and pl.scope = 'assigned'
        and pl.status = 'active'
        and c.status = 'active'
        and c.id in (select public.current_customer_ids())
    )
  );
