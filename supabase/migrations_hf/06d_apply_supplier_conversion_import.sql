-- F8.1-C: conversões fornecedor × produto (kind=supplier_conversion)
-- Fonte oficial: supplier_products (NÃO product_references).
-- Upsert por (supplier_id, supplier_sku); SKU FAL inexistente = erro (sem auto-criar produto).

-- ---------------------------------------------------------------------------
-- imports.supplier_id (kinds de fornecedor)
-- ---------------------------------------------------------------------------
alter table public.imports
  add column if not exists supplier_id uuid references public.suppliers (id) on delete set null;

create index if not exists imports_supplier_id_idx
  on public.imports (supplier_id)
  where supplier_id is not null;

-- ---------------------------------------------------------------------------
-- UNIQUE parcial: um código de fornecedor → no máximo um produto FAL
-- ---------------------------------------------------------------------------
create unique index if not exists supplier_products_supplier_sku_uidx
  on public.supplier_products (supplier_id, supplier_sku)
  where supplier_sku is not null;

-- ---------------------------------------------------------------------------
-- Apply conversões (transacional) — mesmas roles F8.1 D13
-- ---------------------------------------------------------------------------
create or replace function public.apply_supplier_conversion_import(p_import_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_kind text;
  v_status text;
  v_supplier_id uuid;
  v_created int := 0;
  v_updated int := 0;
  v_failed int := 0;
  v_skipped int := 0;
  r record;
  v_sku text;
  v_supplier_sku text;
  v_product_id uuid;
  v_row_by_sku uuid;
  v_row_by_product uuid;
begin
  if v_uid is null then
    raise exception 'Nao autenticado' using errcode = '42501';
  end if;

  if not public.staff_can_import_catalog() then
    raise exception 'Somente administrador ou gerente pode importar conversoes'
      using errcode = '42501';
  end if;

  select i.kind, i.status, i.supplier_id
    into v_kind, v_status, v_supplier_id
  from public.imports i
  where i.id = p_import_id
  for update;

  if not found then
    raise exception 'Importacao nao encontrada' using errcode = 'P0001';
  end if;

  if v_kind is distinct from 'supplier_conversion' then
    raise exception 'Importacao nao e do tipo supplier_conversion' using errcode = 'P0001';
  end if;

  if v_supplier_id is null then
    raise exception 'Importacao sem fornecedor (supplier_id)' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.suppliers s
    where s.id = v_supplier_id and s.status = 'active'
  ) then
    raise exception 'Fornecedor inexistente ou inativo' using errcode = 'P0001';
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
      v_supplier_sku := nullif(trim(both from coalesce(r.payload ->> 'supplier_sku', '')), '');

      if v_sku is null or v_supplier_sku is null then
        update public.import_items
        set result = 'error',
            errors = array['SKU FAL ou codigo fornecedor ausente']
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
        update public.import_items
        set result = 'error',
            errors = array['Produto nao encontrado (SKU FAL inexistente)']
        where id = r.id;
        v_failed := v_failed + 1;
        continue;
      end if;

      select sp.id into v_row_by_sku
      from public.supplier_products sp
      where sp.supplier_id = v_supplier_id
        and sp.supplier_sku = v_supplier_sku
      limit 1;

      select sp.id into v_row_by_product
      from public.supplier_products sp
      where sp.supplier_id = v_supplier_id
        and sp.product_id = v_product_id
      limit 1;

      if v_row_by_sku is not null
         and v_row_by_product is not null
         and v_row_by_sku is distinct from v_row_by_product then
        -- Duas linhas conflitantes: manter a do supplier_sku, remover a do produto
        delete from public.supplier_products where id = v_row_by_product;
        update public.supplier_products
        set product_id = v_product_id
        where id = v_row_by_sku;

        update public.import_items
        set result = 'updated',
            payload = coalesce(r.payload, '{}'::jsonb) || jsonb_build_object(
              'product_id', v_product_id,
              'action', 'updated'
            )
        where id = r.id;
        v_updated := v_updated + 1;

      elsif v_row_by_sku is not null then
        update public.supplier_products
        set product_id = v_product_id
        where id = v_row_by_sku;

        update public.import_items
        set result = 'updated',
            payload = coalesce(r.payload, '{}'::jsonb) || jsonb_build_object(
              'product_id', v_product_id,
              'action', 'updated'
            )
        where id = r.id;
        v_updated := v_updated + 1;

      elsif v_row_by_product is not null then
        update public.supplier_products
        set supplier_sku = v_supplier_sku
        where id = v_row_by_product;

        update public.import_items
        set result = 'updated',
            payload = coalesce(r.payload, '{}'::jsonb) || jsonb_build_object(
              'product_id', v_product_id,
              'action', 'updated'
            )
        where id = r.id;
        v_updated := v_updated + 1;

      else
        insert into public.supplier_products (supplier_id, product_id, supplier_sku)
        values (v_supplier_id, v_product_id, v_supplier_sku);

        update public.import_items
        set result = 'created',
            payload = coalesce(r.payload, '{}'::jsonb) || jsonb_build_object(
              'product_id', v_product_id,
              'action', 'created'
            )
        where id = r.id;
        v_created := v_created + 1;
      end if;
    exception when others then
      update public.import_items
      set result = 'error',
          errors = array[left(SQLERRM, 200)]
      where id = r.id;
      v_failed := v_failed + 1;
    end;
  end loop;

  update public.imports
  set
    status = case when v_created + v_updated = 0 and v_failed > 0 then 'failed' else 'done' end,
    report = jsonb_build_object(
      'created', v_created,
      'updated', v_updated,
      'failed', v_failed,
      'skipped', v_skipped
    )
  where id = p_import_id;

  return jsonb_build_object(
    'created', v_created,
    'updated', v_updated,
    'failed', v_failed,
    'skipped', v_skipped
  );
end;
$$;

revoke all on function public.apply_supplier_conversion_import(uuid) from public;
grant execute on function public.apply_supplier_conversion_import(uuid) to authenticated;
