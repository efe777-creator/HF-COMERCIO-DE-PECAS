-- F8.1-D: importação de custos (kind=supplier_cost) + preparação D15 (custo adicional)
-- Custo base: supplier_products.cost
-- Sem conversão = erro (não cria vínculo nem produto)
-- Não recalcula preço de venda nesta fatia (F8.1-E / D16)

-- ---------------------------------------------------------------------------
-- D15: custo adicional no item + placeholder na lista (sem rateio/UI avançada)
-- ---------------------------------------------------------------------------
alter table public.price_list_items
  add column if not exists extra_cost numeric(12, 2) not null default 0
    check (extra_cost >= 0);

alter table public.price_lists
  add column if not exists list_extra_cost numeric(12, 2) not null default 0
    check (list_extra_cost >= 0);

comment on column public.price_list_items.extra_cost is
  'F8.1 D15: custo_adicional_item. custo_total = base + extra_cost (+ list_extra_cost).';

comment on column public.price_lists.list_extra_cost is
  'F8.1 D15: placeholder custo_adicional_da_lista. Sem rateio nesta fase.';

-- ---------------------------------------------------------------------------
-- Apply custos (transacional)
-- ---------------------------------------------------------------------------
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
  v_updated int := 0;
  v_failed int := 0;
  v_skipped int := 0;
  r record;
  v_supplier_sku text;
  v_cost numeric;
  v_sp_id uuid;
  v_product_id uuid;
  v_old_cost numeric;
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

      v_supplier_sku := nullif(trim(both from coalesce(r.payload ->> 'supplier_sku', '')), '');
      begin
        v_cost := (r.payload ->> 'cost')::numeric;
      exception when others then
        v_cost := null;
      end;

      if v_supplier_sku is null or v_cost is null or v_cost < 0 then
        update public.import_items
        set result = 'error',
            errors = array['Codigo fornecedor ou custo invalido']
        where id = r.id;
        v_failed := v_failed + 1;
        continue;
      end if;

      select sp.id, sp.product_id, sp.cost
        into v_sp_id, v_product_id, v_old_cost
      from public.supplier_products sp
      where sp.supplier_id = v_supplier_id
        and sp.supplier_sku = v_supplier_sku
      limit 1;

      if v_sp_id is null then
        update public.import_items
        set result = 'error',
            errors = array['Sem conversao: codigo fornecedor nao vinculado a produto FAL']
        where id = r.id;
        v_failed := v_failed + 1;
        continue;
      end if;

      update public.supplier_products
      set cost = round(v_cost, 2)
      where id = v_sp_id;

      -- Nao recalcula price_list_items aqui (F8.1-E / D16).

      update public.import_items
      set result = 'updated',
          payload = coalesce(r.payload, '{}'::jsonb) || jsonb_build_object(
            'product_id', v_product_id,
            'old_cost', v_old_cost,
            'action', 'updated'
          )
      where id = r.id;

      v_updated := v_updated + 1;
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
    status = case when v_updated = 0 and v_failed > 0 then 'failed' else 'done' end,
    report = jsonb_build_object(
      'updated', v_updated,
      'failed', v_failed,
      'skipped', v_skipped,
      'created', 0
    )
  where id = p_import_id;

  return jsonb_build_object(
    'updated', v_updated,
    'failed', v_failed,
    'skipped', v_skipped,
    'created', 0
  );
end;
$$;

revoke all on function public.apply_supplier_cost_import(uuid) from public;
grant execute on function public.apply_supplier_cost_import(uuid) to authenticated;
