-- F8.1-E: formação de preço (margem/markup) + price_origin + recalcular
-- Custo base: supplier_products.cost do products.supplier_id (fornecedor principal).
-- custo_total = base + price_list_items.extra_cost
-- list_extra_cost permanece PLACEHOLDER (não entra no cálculo; sem rateio).
-- adjust_price_list_items NÃO é o motor de formação — permanece ajuste cego %/R$.

-- ---------------------------------------------------------------------------
-- History: source recalculate
-- ---------------------------------------------------------------------------
alter table public.price_change_history
  drop constraint if exists price_change_history_source_check;

alter table public.price_change_history
  add constraint price_change_history_source_check
  check (source in ('manual', 'import', 'system', 'override', 'bulk_adjust', 'recalculate'));

-- ---------------------------------------------------------------------------
-- price_lists: regra de formação
-- ---------------------------------------------------------------------------
alter table public.price_lists
  add column if not exists pricing_method text not null default 'fixed'
    check (pricing_method in ('margin_on_sell', 'markup_on_cost', 'fixed'));

alter table public.price_lists
  add column if not exists pricing_percent numeric(8, 4) not null default 0;

alter table public.price_lists
  add column if not exists rounding_mode text not null default 'two_decimals'
    check (rounding_mode in ('two_decimals'));

comment on column public.price_lists.list_extra_cost is
  'F8.1 D15 PLACEHOLDER: custo_adicional_da_lista. NÃO entra no cálculo até rateio definido (F8.1-E).';

comment on column public.price_lists.pricing_method is
  'F8.1-E: margin_on_sell | markup_on_cost | fixed';

-- ---------------------------------------------------------------------------
-- price_list_items: origem + preço calculado
-- ---------------------------------------------------------------------------
alter table public.price_list_items
  add column if not exists price_origin text not null default 'manual'
    check (price_origin in ('calculated', 'imported', 'manual'));

alter table public.price_list_items
  add column if not exists calculated_price numeric(12, 2);

-- Itens existentes: manual (não sobrescrever em recalc automático)
update public.price_list_items
set price_origin = 'manual'
where price_origin is null or price_origin = '';

comment on column public.price_list_items.extra_cost is
  'F8.1 D15: custo_adicional_item. Entra em custo_total = base + extra_cost.';

comment on column public.price_list_items.price_origin is
  'F8.1-E D16: calculated | imported | manual — anti-circularidade';

-- ---------------------------------------------------------------------------
-- Custo base: fornecedor principal do produto (sem lowest-cost)
-- ---------------------------------------------------------------------------
create or replace function public.product_base_cost(p_product_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select sp.cost
  from public.products p
  join public.supplier_products sp
    on sp.product_id = p.id
   and sp.supplier_id = p.supplier_id
  where p.id = p_product_id
    and p.supplier_id is not null
    and sp.cost is not null
  limit 1;
$$;

revoke all on function public.product_base_cost(uuid) from public;
grant execute on function public.product_base_cost(uuid) to authenticated;

-- custo_total = base + extra_cost (list_extra_cost FORA)
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
  return round(v_base + v_extra, 2);
end;
$$;

revoke all on function public.compute_item_cost_total(uuid, numeric) from public;
grant execute on function public.compute_item_cost_total(uuid, numeric) to authenticated;

-- Fórmulas (espelho de pricingFormulas.ts)
create or replace function public.calculate_sell_from_cost(
  p_cost_total numeric,
  p_method text,
  p_percent numeric
)
returns numeric
language plpgsql
immutable
as $$
declare
  v_price numeric;
begin
  if p_method is null or p_method = 'fixed' then
    return null;
  end if;
  if p_cost_total is null or p_cost_total < 0 or p_percent is null then
    return null;
  end if;

  if p_method = 'markup_on_cost' then
    v_price := p_cost_total * (1 + p_percent / 100.0);
  elsif p_method = 'margin_on_sell' then
    if p_percent >= 100 then
      return null;
    end if;
    if (1 - p_percent / 100.0) <= 0 then
      return null;
    end if;
    v_price := p_cost_total / (1 - p_percent / 100.0);
  else
    return null;
  end if;

  if v_price is null or v_price <> v_price or v_price < 0 then
    return null;
  end if;
  return round(v_price, 2);
end;
$$;

revoke all on function public.calculate_sell_from_cost(numeric, text, numeric) from public;
grant execute on function public.calculate_sell_from_cost(numeric, text, numeric) to authenticated;

-- ---------------------------------------------------------------------------
-- Atualizar regra da lista (+ opcional recalc dos calculated)
-- ---------------------------------------------------------------------------
create or replace function public.set_price_list_pricing_rule(
  p_price_list_id uuid,
  p_pricing_method text,
  p_pricing_percent numeric,
  p_rounding_mode text default 'two_decimals',
  p_recalculate boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_recalc jsonb;
begin
  if v_uid is null then
    raise exception 'Nao autenticado' using errcode = '42501';
  end if;
  if not public.staff_can_import_catalog() then
    raise exception 'Somente administrador ou gerente pode alterar regra de preco'
      using errcode = '42501';
  end if;

  if p_pricing_method is null
     or p_pricing_method not in ('margin_on_sell', 'markup_on_cost', 'fixed') then
    raise exception 'pricing_method invalido' using errcode = 'P0001';
  end if;

  if p_pricing_method = 'margin_on_sell' and coalesce(p_pricing_percent, 0) >= 100 then
    raise exception 'Margem deve ser menor que 100%%' using errcode = 'P0001';
  end if;

  if p_pricing_percent is null or p_pricing_percent < 0 then
    raise exception 'Percentual invalido' using errcode = 'P0001';
  end if;

  if coalesce(p_rounding_mode, 'two_decimals') <> 'two_decimals' then
    raise exception 'rounding_mode nao suportado' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.price_lists where id = p_price_list_id) then
    raise exception 'Lista nao encontrada' using errcode = 'P0001';
  end if;

  update public.price_lists
  set
    pricing_method = p_pricing_method,
    pricing_percent = p_pricing_percent,
    rounding_mode = coalesce(p_rounding_mode, 'two_decimals'),
    updated_at = now()
  where id = p_price_list_id;

  if p_recalculate and p_pricing_method <> 'fixed' then
    v_recalc := public.recalculate_price_list_items(p_price_list_id, false);
  else
    v_recalc := jsonb_build_object('updated', 0, 'skipped', true);
  end if;

  return jsonb_build_object(
    'ok', true,
    'pricing_method', p_pricing_method,
    'pricing_percent', p_pricing_percent,
    'recalculate', v_recalc
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Recalcular somente price_origin = calculated
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
  v_skip_fixed int := 0;
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

    v_cost := public.compute_item_cost_total(r.product_id, r.extra_cost);
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
      -- ainda atualiza calculated_price se necessário no apply
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

-- ---------------------------------------------------------------------------
-- Definir preço do item com origem explícita (manual / calculated / imported)
-- ---------------------------------------------------------------------------
create or replace function public.set_price_list_item_pricing(
  p_item_id uuid,
  p_mode text, -- 'manual' | 'apply_rule'
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
    v_cost := public.compute_item_cost_total(v_product_id, v_extra);
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

-- ---------------------------------------------------------------------------
-- Recalc após mudança de custo (produtos afetados) — só calculated
-- ---------------------------------------------------------------------------
create or replace function public.recalculate_calculated_for_products(p_product_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_list_id uuid;
  v_total_updated int := 0;
  v_recalc jsonb;
begin
  if p_product_ids is null or array_length(p_product_ids, 1) is null then
    return jsonb_build_object('updated', 0);
  end if;

  for v_list_id in
    select distinct pli.price_list_id
    from public.price_list_items pli
    where pli.product_id = any (p_product_ids)
      and pli.price_origin = 'calculated'
  loop
    -- recalcula a lista inteira (só calculated); barato o suficiente no MVP
    v_recalc := public.recalculate_price_list_items(v_list_id, false);
    v_total_updated := v_total_updated + coalesce((v_recalc ->> 'updated')::int, 0);
  end loop;

  return jsonb_build_object('updated', v_total_updated);
end;
$$;

-- Atualizar apply_supplier_cost_import para disparar recalc (D16)
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
  v_affected uuid[] := '{}';
  v_recalc jsonb;
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

      v_affected := array_append(v_affected, v_product_id);

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
      set result = 'error', errors = array[left(SQLERRM, 200)]
      where id = r.id;
      v_failed := v_failed + 1;
    end;
  end loop;

  -- D16: só itens calculated são afetados
  v_recalc := public.recalculate_calculated_for_products(v_affected);

  update public.imports
  set
    status = case when v_updated = 0 and v_failed > 0 then 'failed' else 'done' end,
    report = jsonb_build_object(
      'updated', v_updated,
      'failed', v_failed,
      'skipped', v_skipped,
      'created', 0,
      'recalculated', v_recalc
    )
  where id = p_import_id;

  return jsonb_build_object(
    'updated', v_updated,
    'failed', v_failed,
    'skipped', v_skipped,
    'created', 0,
    'recalculated', v_recalc
  );
end;
$$;

revoke all on function public.set_price_list_pricing_rule(uuid, text, numeric, text, boolean) from public;
revoke all on function public.recalculate_price_list_items(uuid, boolean) from public;
revoke all on function public.set_price_list_item_pricing(uuid, text, numeric, numeric) from public;
revoke all on function public.recalculate_calculated_for_products(uuid[]) from public;

grant execute on function public.set_price_list_pricing_rule(uuid, text, numeric, text, boolean) to authenticated;
grant execute on function public.recalculate_price_list_items(uuid, boolean) to authenticated;
grant execute on function public.set_price_list_item_pricing(uuid, text, numeric, numeric) to authenticated;
grant execute on function public.recalculate_calculated_for_products(uuid[]) to authenticated;
