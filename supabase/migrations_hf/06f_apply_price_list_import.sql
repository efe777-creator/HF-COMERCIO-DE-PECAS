-- F8.1-F: importação de preço de venda com price_origin=imported via RPC
-- Evolui F6B: substitui apply client-side. Não recalcula calculated/manual.
-- Idempotente: UNIQUE(price_list_id, product_id).

create or replace function public.apply_price_list_import(p_import_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_kind text;
  v_status text;
  v_price_list_id uuid;
  v_updated int := 0;
  v_inserted int := 0;
  v_failed int := 0;
  v_skipped int := 0;
  r record;
  v_sku text;
  v_price numeric;
  v_product_id uuid;
  v_existing_id uuid;
  v_old_price numeric;
  v_old_origin text;
begin
  if v_uid is null then
    raise exception 'Nao autenticado' using errcode = '42501';
  end if;

  if not public.staff_can_import_catalog() then
    raise exception 'Somente administrador ou gerente pode importar precos de venda'
      using errcode = '42501';
  end if;

  select i.kind, i.status, i.price_list_id
    into v_kind, v_status, v_price_list_id
  from public.imports i
  where i.id = p_import_id
  for update;

  if not found then
    raise exception 'Importacao nao encontrada' using errcode = 'P0001';
  end if;

  if v_kind is distinct from 'price_list' then
    raise exception 'Importacao nao e do tipo price_list' using errcode = 'P0001';
  end if;

  if v_price_list_id is null then
    raise exception 'Importacao sem lista de preco (price_list_id)' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.price_lists where id = v_price_list_id) then
    raise exception 'Lista de precos nao encontrada' using errcode = 'P0001';
  end if;

  if v_status not in ('preview', 'validated') then
    raise exception 'Importacao deve estar em preview/validated (atual: %)', v_status
      using errcode = 'P0001';
  end if;

  update public.imports
  set status = 'importing'
  where id = p_import_id;

  for r in
    select ii.id, ii.line_number, ii.payload, ii.result
    from public.import_items ii
    where ii.import_id = p_import_id
    order by ii.line_number nulls last, ii.created_at
  loop
    begin
      if r.result is distinct from 'ok' then
        v_skipped := v_skipped + 1;
        continue;
      end if;

      v_sku := nullif(trim(both from coalesce(r.payload ->> 'sku', '')), '');
      begin
        v_price := (r.payload ->> 'price')::numeric;
      exception when others then
        v_price := null;
      end;

      if v_sku is null or v_price is null or v_price < 0 or v_price <> v_price then
        update public.import_items
        set result = 'error',
            errors = array['SKU ou preco invalido no payload']
        where id = r.id;
        v_failed := v_failed + 1;
        continue;
      end if;

      -- Revalidar produto (nunca criar)
      select p.id into v_product_id
      from public.products p
      where p.sku = v_sku
      limit 1;

      if v_product_id is null then
        -- fallback: product_id do preview
        begin
          v_product_id := nullif(r.payload ->> 'product_id', '')::uuid;
        exception when others then
          v_product_id := null;
        end;
      end if;

      if v_product_id is null then
        update public.import_items
        set result = 'error',
            errors = array['Produto nao encontrado (SKU inexistente)']
        where id = r.id;
        v_failed := v_failed + 1;
        continue;
      end if;

      v_price := round(v_price, 2);

      select pli.id, pli.price, pli.price_origin
        into v_existing_id, v_old_price, v_old_origin
      from public.price_list_items pli
      where pli.price_list_id = v_price_list_id
        and pli.product_id = v_product_id
      limit 1;

      if v_existing_id is null then
        insert into public.price_list_items (
          price_list_id, product_id, price, price_origin
        ) values (
          v_price_list_id, v_product_id, v_price, 'imported'
        );

        insert into public.price_change_history (
          product_id, price_list_id, old_price, new_price, changed_by, source, import_id
        ) values (
          v_product_id, v_price_list_id, null, v_price, v_uid, 'import', p_import_id
        );

        update public.import_items
        set result = 'created',
            payload = coalesce(r.payload, '{}'::jsonb) || jsonb_build_object(
              'product_id', v_product_id,
              'price_origin', 'imported',
              'old_price', null,
              'action', 'created'
            )
        where id = r.id;

        v_inserted := v_inserted + 1;
      else
        update public.price_list_items
        set
          price = v_price,
          price_origin = 'imported',
          updated_at = now()
        where id = v_existing_id;

        if abs(coalesce(v_old_price, -1) - v_price) >= 0.001
           or v_old_origin is distinct from 'imported' then
          insert into public.price_change_history (
            product_id, price_list_id, old_price, new_price, changed_by, source, import_id
          ) values (
            v_product_id, v_price_list_id, v_old_price, v_price, v_uid, 'import', p_import_id
          );
        end if;

        update public.import_items
        set result = 'updated',
            payload = coalesce(r.payload, '{}'::jsonb) || jsonb_build_object(
              'product_id', v_product_id,
              'price_origin', 'imported',
              'old_price', v_old_price,
              'action', 'updated'
            )
        where id = r.id;

        v_updated := v_updated + 1;
      end if;

    exception when others then
      update public.import_items
      set result = 'error',
          errors = array[left(SQLERRM, 200)]
      where id = r.id;
      v_failed := v_failed + 1;
    end;
  end loop;

  -- NÃO chama recalculate — imported/manual preservados; calculated intactos.

  update public.imports
  set
    status = case
      when (v_updated + v_inserted) = 0 and v_failed > 0 then 'failed'
      else 'done'
    end,
    report = jsonb_build_object(
      'updated', v_updated,
      'inserted', v_inserted,
      'failed', v_failed,
      'skipped', v_skipped,
      'applied', v_updated + v_inserted,
      'price_origin', 'imported'
    )
  where id = p_import_id;

  return jsonb_build_object(
    'updated', v_updated,
    'inserted', v_inserted,
    'failed', v_failed,
    'skipped', v_skipped,
    'applied', v_updated + v_inserted,
    'price_origin', 'imported'
  );
end;
$$;

revoke all on function public.apply_price_list_import(uuid) from public;
grant execute on function public.apply_price_list_import(uuid) to authenticated;
