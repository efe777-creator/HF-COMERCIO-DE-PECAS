-- FAL Principal (code FAL-SUP-01): codigo_fornecedor = products.sku.
-- Sem conversão prévia: upsert supplier_products por SKU FAL.

create or replace function public.apply_supplier_cost_import(p_import_id uuid)
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
  v_supplier_code text;
  v_is_fal_principal boolean := false;
  v_updated int := 0;
  v_created int := 0;
  v_failed int := 0;
  v_skipped int := 0;
  r record;
  v_supplier_sku text;
  v_cost numeric;
  v_sp_id uuid;
  v_product_id uuid;
  v_old_cost numeric;
  v_product_sku text;
  v_affected uuid[] := '{}';
  v_recalc jsonb;
  v_action text;
begin
  if v_uid is null then
    raise exception 'Nao autenticado' using errcode = '42501';
  end if;

  if not public.staff_can_import_catalog() then
    raise exception 'Somente administrador ou gerente pode importar custos'
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

  if v_kind is distinct from 'supplier_cost' then
    raise exception 'Importacao nao e do tipo supplier_cost' using errcode = 'P0001';
  end if;

  if v_supplier_id is null then
    raise exception 'Importacao sem fornecedor (supplier_id)' using errcode = 'P0001';
  end if;

  select s.code into v_supplier_code
  from public.suppliers s
  where s.id = v_supplier_id and s.status = 'active';

  if not found then
    raise exception 'Fornecedor inexistente ou inativo' using errcode = 'P0001';
  end if;

  v_is_fal_principal := upper(trim(both from coalesce(v_supplier_code, ''))) = 'FAL-SUP-01';

  if v_status not in ('preview', 'validated') then
    raise exception 'Importacao deve estar em preview/validated (atual: %)', v_status
      using errcode = 'P0001';
  end if;

  update public.imports set status = 'importing' where id = p_import_id;

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

      v_supplier_sku := nullif(trim(both from coalesce(r.payload ->> 'supplier_sku', '')), '');
      begin
        v_cost := (r.payload ->> 'cost')::numeric;
      exception when others then
        v_cost := null;
      end;

      if v_supplier_sku is null or v_cost is null or v_cost < 0 then
        update public.import_items
        set result = 'error', errors = array['Codigo fornecedor ou custo invalido']
        where id = r.id;
        v_failed := v_failed + 1;
        continue;
      end if;

      v_sp_id := null;
      v_product_id := null;
      v_old_cost := null;
      v_product_sku := null;
      v_action := 'updated';

      select sp.id, sp.product_id, sp.cost
        into v_sp_id, v_product_id, v_old_cost
      from public.supplier_products sp
      where sp.supplier_id = v_supplier_id
        and sp.supplier_sku = v_supplier_sku
      limit 1;

      -- FAL Principal: codigo = SKU FAL — cria/atualiza vínculo se necessário
      if v_sp_id is null and v_is_fal_principal then
        select p.id, p.sku
          into v_product_id, v_product_sku
        from public.products p
        where p.sku = v_supplier_sku
        limit 1;

        if v_product_id is null then
          update public.import_items
          set result = 'error',
              errors = array['SKU FAL nao encontrado (FAL Principal)']
          where id = r.id;
          v_failed := v_failed + 1;
          continue;
        end if;

        select sp.id, sp.cost
          into v_sp_id, v_old_cost
        from public.supplier_products sp
        where sp.supplier_id = v_supplier_id
          and sp.product_id = v_product_id
        limit 1;

        if v_sp_id is null then
          insert into public.supplier_products (supplier_id, product_id, supplier_sku, cost)
          values (v_supplier_id, v_product_id, v_supplier_sku, round(v_cost, 2))
          returning id into v_sp_id;
          v_old_cost := null;
          v_action := 'created';
          v_created := v_created + 1;
        else
          update public.supplier_products
          set cost = round(v_cost, 2),
              supplier_sku = coalesce(nullif(supplier_sku, ''), v_supplier_sku)
          where id = v_sp_id;
          v_updated := v_updated + 1;
        end if;
      elsif v_sp_id is null then
        update public.import_items
        set result = 'error',
            errors = array['Sem conversao: codigo fornecedor nao vinculado a produto FAL']
        where id = r.id;
        v_failed := v_failed + 1;
        continue;
      else
        update public.supplier_products
        set cost = round(v_cost, 2)
        where id = v_sp_id;
        v_updated := v_updated + 1;
      end if;

      if v_product_id is null then
        select sp.product_id into v_product_id
        from public.supplier_products sp
        where sp.id = v_sp_id;
      end if;

      v_affected := array_append(v_affected, v_product_id);

      update public.import_items
      set result = v_action,
          payload = coalesce(r.payload, '{}'::jsonb) || jsonb_build_object(
            'product_id', v_product_id,
            'old_cost', v_old_cost,
            'action', v_action
          )
      where id = r.id;

      if v_action = 'created' then
        null; -- contador já incrementado
      end if;
    exception when others then
      update public.import_items
      set result = 'error', errors = array[left(SQLERRM, 200)]
      where id = r.id;
      v_failed := v_failed + 1;
    end;
  end loop;

  v_recalc := public.recalculate_calculated_for_products(v_affected);

  update public.imports
  set
    status = case when v_updated = 0 and v_created = 0 and v_failed > 0 then 'failed' else 'done' end,
    report = jsonb_build_object(
      'updated', v_updated,
      'created', v_created,
      'failed', v_failed,
      'skipped', v_skipped,
      'recalculated', v_recalc
    )
  where id = p_import_id;

  return jsonb_build_object(
    'updated', v_updated,
    'created', v_created,
    'failed', v_failed,
    'skipped', v_skipped,
    'recalculated', v_recalc
  );
end;
$$;
