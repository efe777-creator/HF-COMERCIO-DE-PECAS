-- PREPARED — NÃO APLICAR automaticamente (auditoria operacional 2026-10-06).
-- Adicional de custo (%) da lista: coluna nova, paralelo a list_extra_cost (R$).
--
-- Compatibilidade:
--   * list_extra_cost (R$) NÃO é removido nem muda de significado (placeholder / fora do cálculo).
--   * list_extra_cost_percent é campo ADICIONAL.
--
-- Fórmula alvo:
--   custo_total = product_base_cost(product) * (1 + list_extra_cost_percent/100)
--                 + price_list_items.extra_cost
--   list_extra_cost (R$) permanece FORA do cálculo.

-- ---------------------------------------------------------------------------
-- Coluna
-- ---------------------------------------------------------------------------
alter table public.price_lists
  add column if not exists list_extra_cost_percent numeric(8, 4) not null default 0
    check (list_extra_cost_percent >= 0);

comment on column public.price_lists.list_extra_cost is
  'F8.1 D15: placeholder custo_adicional_da_lista em R$. Sem rateio; NÃO entra no cálculo.';

comment on column public.price_lists.list_extra_cost_percent is
  'Adicional de custo (%) da lista. Entra em custo_total = base*(1+pct/100)+extra_cost do item.';

-- ---------------------------------------------------------------------------
-- compute_item_cost_total: passa a considerar % da lista (via price_list_id no item)
-- Assinatura antiga (product_id, extra_cost) mantida para compat: aí % = 0.
-- Nova overload com price_list_id aplica o %.
-- ---------------------------------------------------------------------------
create or replace function public.compute_item_cost_total(
  p_product_id uuid,
  p_extra_cost numeric
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_base numeric;
  v_extra numeric := coalesce(p_extra_cost, 0);
begin
  v_base := public.product_base_cost(p_product_id);
  if v_base is null then
    return null;
  end if;
  if v_base < 0 or v_extra < 0 then
    return null;
  end if;
  -- Sem price_list_id: comportamento legado (sem % de lista)
  return round(v_base + v_extra, 2);
end;
$$;

create or replace function public.compute_item_cost_total(
  p_product_id uuid,
  p_extra_cost numeric,
  p_price_list_id uuid
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_base numeric;
  v_extra numeric := coalesce(p_extra_cost, 0);
  v_pct numeric := 0;
begin
  v_base := public.product_base_cost(p_product_id);
  if v_base is null then
    return null;
  end if;
  if v_base < 0 or v_extra < 0 then
    return null;
  end if;

  if p_price_list_id is not null then
    select coalesce(pl.list_extra_cost_percent, 0)
      into v_pct
    from public.price_lists pl
    where pl.id = p_price_list_id;
  end if;

  if v_pct < 0 then
    return null;
  end if;

  -- list_extra_cost (R$) permanece FORA
  return round(v_base * (1 + v_pct / 100.0) + v_extra, 2);
end;
$$;

revoke all on function public.compute_item_cost_total(uuid, numeric) from public;
grant execute on function public.compute_item_cost_total(uuid, numeric) to authenticated;
revoke all on function public.compute_item_cost_total(uuid, numeric, uuid) from public;
grant execute on function public.compute_item_cost_total(uuid, numeric, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- F8.5 Opção A — callers usam overload com price_list_id
-- list_extra_cost (R$) da lista permanece FORA do cálculo.
-- ---------------------------------------------------------------------------

create or replace function public.recalculate_price_list_items(
  p_price_list_id uuid,
  p_dry_run boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_method text;
  v_percent numeric;
  r record;
  v_cost numeric;
  v_new numeric;
  v_would int := 0;
  v_updated int := 0;
  v_skip_manual int := 0;
  v_skip_imported int := 0;
  v_skip_no_cost int := 0;
  v_skip_unchanged int := 0;
  v_errors int := 0;
  v_sample jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'Nao autenticado' using errcode = '42501';
  end if;
  if not public.staff_can_import_catalog() then
    raise exception 'Somente administrador ou gerente pode recalcular precos'
      using errcode = '42501';
  end if;

  select pl.pricing_method, pl.pricing_percent
    into v_method, v_percent
  from public.price_lists pl
  where pl.id = p_price_list_id;

  if not found then
    raise exception 'Lista nao encontrada' using errcode = 'P0001';
  end if;

  if v_method = 'fixed' then
    return jsonb_build_object(
      'dry_run', p_dry_run,
      'would_update', 0,
      'updated', 0,
      'skipped_fixed_method', true,
      'message', 'Lista em modo fixed — sem recalculo por custo'
    );
  end if;

  for r in
    select
      pli.id,
      pli.product_id,
      pli.price,
      pli.extra_cost,
      pli.price_origin,
      p.sku
    from public.price_list_items pli
    join public.products p on p.id = pli.product_id
    where pli.price_list_id = p_price_list_id
  loop
    if r.price_origin = 'manual' then
      v_skip_manual := v_skip_manual + 1;
      continue;
    end if;
    if r.price_origin = 'imported' then
      v_skip_imported := v_skip_imported + 1;
      continue;
    end if;
    if r.price_origin is distinct from 'calculated' then
      continue;
    end if;

    v_cost := public.compute_item_cost_total(r.product_id, r.extra_cost, p_price_list_id);
    if v_cost is null then
      v_skip_no_cost := v_skip_no_cost + 1;
      continue;
    end if;

    v_new := public.calculate_sell_from_cost(v_cost, v_method, v_percent);
    if v_new is null then
      v_errors := v_errors + 1;
      continue;
    end if;

    if abs(coalesce(r.price, 0) - v_new) < 0.001 then
      if not p_dry_run then
        update public.price_list_items
        set calculated_price = v_new, updated_at = now()
        where id = r.id and (calculated_price is distinct from v_new);
      end if;
      v_skip_unchanged := v_skip_unchanged + 1;
      continue;
    end if;

    v_would := v_would + 1;
    if jsonb_array_length(v_sample) < 10 then
      v_sample := v_sample || jsonb_build_array(jsonb_build_object(
        'sku', r.sku,
        'old_price', r.price,
        'new_price', v_new,
        'cost_total', v_cost
      ));
    end if;

    if not p_dry_run then
      update public.price_list_items
      set
        price = v_new,
        calculated_price = v_new,
        updated_at = now()
      where id = r.id;

      insert into public.price_change_history (
        product_id, price_list_id, old_price, new_price, changed_by, source
      ) values (
        r.product_id, p_price_list_id, r.price, v_new, v_uid, 'recalculate'
      );

      v_updated := v_updated + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'dry_run', p_dry_run,
    'would_update', v_would,
    'updated', v_updated,
    'skipped_manual', v_skip_manual,
    'skipped_imported', v_skip_imported,
    'skipped_no_cost', v_skip_no_cost,
    'skipped_unchanged', v_skip_unchanged,
    'errors', v_errors,
    'sample', v_sample
  );
end;
$$;

create or replace function public.set_price_list_item_pricing(
  p_item_id uuid,
  p_mode text,
  p_price numeric default null,
  p_extra_cost numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_list_id uuid;
  v_product_id uuid;
  v_old numeric;
  v_origin text;
  v_method text;
  v_percent numeric;
  v_extra numeric;
  v_cost numeric;
  v_new numeric;
begin
  if v_uid is null then
    raise exception 'Nao autenticado' using errcode = '42501';
  end if;
  if not public.staff_can_import_catalog() then
    raise exception 'Somente administrador ou gerente pode alterar preco do item'
      using errcode = '42501';
  end if;

  select pli.price_list_id, pli.product_id, pli.price, pli.price_origin, pli.extra_cost,
         pl.pricing_method, pl.pricing_percent
    into v_list_id, v_product_id, v_old, v_origin, v_extra, v_method, v_percent
  from public.price_list_items pli
  join public.price_lists pl on pl.id = pli.price_list_id
  where pli.id = p_item_id
  for update of pli;

  if not found then
    raise exception 'Item nao encontrado' using errcode = 'P0001';
  end if;

  if p_extra_cost is not null then
    if p_extra_cost < 0 then
      raise exception 'extra_cost invalido' using errcode = 'P0001';
    end if;
    v_extra := p_extra_cost;
  end if;

  if p_mode = 'manual' then
    if p_price is null or p_price < 0 or p_price <> p_price then
      raise exception 'Preco manual invalido' using errcode = 'P0001';
    end if;
    v_new := round(p_price, 2);

    update public.price_list_items
    set
      price = v_new,
      price_origin = 'manual',
      extra_cost = v_extra,
      updated_at = now()
    where id = p_item_id;

    if abs(coalesce(v_old, 0) - v_new) >= 0.001 then
      insert into public.price_change_history (
        product_id, price_list_id, old_price, new_price, changed_by, source
      ) values (v_product_id, v_list_id, v_old, v_new, v_uid, 'manual');
    end if;

    return jsonb_build_object(
      'ok', true,
      'price_origin', 'manual',
      'price', v_new,
      'extra_cost', v_extra
    );
  end if;

  if p_mode = 'apply_rule' then
    if v_method = 'fixed' then
      raise exception 'Lista em modo fixed — informe preco manual' using errcode = 'P0001';
    end if;
    v_cost := public.compute_item_cost_total(v_product_id, v_extra, v_list_id);
    if v_cost is null then
      raise exception 'Custo ausente: defina products.supplier_id e supplier_products.cost'
        using errcode = 'P0001';
    end if;
    v_new := public.calculate_sell_from_cost(v_cost, v_method, v_percent);
    if v_new is null then
      raise exception 'Nao foi possivel calcular o preco (verifique margem/markup)'
        using errcode = 'P0001';
    end if;

    update public.price_list_items
    set
      price = v_new,
      calculated_price = v_new,
      price_origin = 'calculated',
      extra_cost = v_extra,
      updated_at = now()
    where id = p_item_id;

    if abs(coalesce(v_old, 0) - v_new) >= 0.001 then
      insert into public.price_change_history (
        product_id, price_list_id, old_price, new_price, changed_by, source
      ) values (v_product_id, v_list_id, v_old, v_new, v_uid, 'recalculate');
    end if;

    return jsonb_build_object(
      'ok', true,
      'price_origin', 'calculated',
      'price', v_new,
      'calculated_price', v_new,
      'cost_total', v_cost,
      'extra_cost', v_extra
    );
  end if;

  raise exception 'p_mode invalido: use manual ou apply_rule' using errcode = 'P0001';
end;
$$;

-- NÃO altera resolve_product_price(s). Apply só com autorização explícita (sem db push automático).
