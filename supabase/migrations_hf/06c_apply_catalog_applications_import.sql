-- Hardening Frente B: apply de aplicacoes nao cria produto (SKU inexistente = erro).

create or replace function public.apply_catalog_applications_import(p_import_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_kind text;
  v_status text;
  r record;
  v_action text;
  v_period_action text;
  v_applyable boolean;
  v_sku text;
  v_name text;
  v_montadora text;
  v_modelo text;
  v_versao text;
  v_year_start int;
  v_year_end int;
  v_product_id uuid;
  v_manufacturer_id uuid;
  v_model_id uuid;
  v_vv_id uuid;
  v_create_product boolean;
  v_create_manufacturer boolean;
  v_create_model boolean;
  v_create_version boolean;
  v_slug text;
  v_base_slug text;
  v_n int;
  v_exist_start int;
  v_exist_end int;
  v_new_start int;
  v_new_end int;
  v_match_count int;

  v_created_products int := 0;
  v_existing_products int := 0;
  v_created_manufacturers int := 0;
  v_existing_manufacturers int := 0;
  v_created_models int := 0;
  v_existing_models int := 0;
  v_created_versions int := 0;
  v_existing_versions int := 0;
  v_created_applications int := 0;
  v_updated_applications int := 0;
  v_already_covered int := 0;
  v_skipped_review int := 0;
  v_skipped_error int := 0;
  v_total int := 0;
begin
  if v_uid is null then
    raise exception 'Nao autenticado' using errcode = '42501';
  end if;

  if not public.staff_can_import_catalog() then
    raise exception 'Somente administrador ou gerente pode importar aplicacoes'
      using errcode = '42501';
  end if;

  select i.kind, i.status
    into v_kind, v_status
  from public.imports i
  where i.id = p_import_id
  for update;

  if not found then
    raise exception 'Importacao nao encontrada' using errcode = 'P0001';
  end if;

  if v_kind is distinct from 'catalog_applications' then
    raise exception 'Importacao nao e do tipo catalog_applications' using errcode = 'P0001';
  end if;

  -- Nivel A: mesma importacao nao se reaplica
  if v_status in ('done', 'importing', 'failed') then
    raise exception 'Esta importacao ja foi processada (status: %)', v_status
      using errcode = 'P0001';
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
    v_total := v_total + 1;

    if r.result is distinct from 'ok' then
      v_skipped_error := v_skipped_error + 1;
      continue;
    end if;

    v_action := nullif(trim(both from coalesce(r.payload ->> 'action', '')), '');
    v_applyable := coalesce((r.payload ->> 'applyable')::boolean, false);
    v_period_action := nullif(trim(both from coalesce(r.payload ->> 'period_action', '')), '');

    if v_action = 'review' or (not v_applyable and v_action is distinct from 'already_covered') then
      if v_action = 'review' then
        v_skipped_review := v_skipped_review + 1;
        update public.import_items
        set result = 'skipped_review'
        where id = r.id;
      elsif v_action = 'error' then
        v_skipped_error := v_skipped_error + 1;
      else
        v_skipped_review := v_skipped_review + 1;
        update public.import_items
        set result = 'skipped_review'
        where id = r.id;
      end if;
      continue;
    end if;

    if v_action = 'already_covered' then
      v_already_covered := v_already_covered + 1;
      update public.import_items
      set result = 'already_covered'
      where id = r.id;
      continue;
    end if;

    if not v_applyable or v_action not in ('new', 'update', 'found') then
      v_skipped_review := v_skipped_review + 1;
      update public.import_items
      set result = 'skipped_review'
      where id = r.id;
      continue;
    end if;

    v_sku := nullif(trim(both from coalesce(r.payload ->> 'sku', '')), '');
    v_name := nullif(trim(both from coalesce(r.payload ->> 'name', '')), '');
    v_montadora := nullif(trim(both from coalesce(r.payload ->> 'montadora', '')), '');
    v_modelo := nullif(trim(both from coalesce(r.payload ->> 'modelo', '')), '');
    v_versao := trim(both from coalesce(r.payload ->> 'versao', ''));
    v_year_start := nullif(r.payload ->> 'year_start', '')::int;
    v_year_end := nullif(r.payload ->> 'year_end', '')::int;
    v_product_id := nullif(r.payload ->> 'product_id', '')::uuid;
    v_manufacturer_id := nullif(r.payload ->> 'manufacturer_id', '')::uuid;
    v_model_id := nullif(r.payload ->> 'model_id', '')::uuid;
    v_vv_id := nullif(r.payload ->> 'vehicle_version_id', '')::uuid;
    v_create_product := false; -- ignorado: aplicacao nao cria produto
    v_create_manufacturer := coalesce((r.payload ->> 'create_manufacturer')::boolean, false);
    v_create_model := coalesce((r.payload ->> 'create_model')::boolean, false);
    v_create_version := coalesce((r.payload ->> 'create_version')::boolean, false);

    if v_sku is null or v_montadora is null or v_modelo is null then
      raise exception 'Linha %: payload incompleto (codigo/montadora/modelo)', r.line_number
        using errcode = 'P0001';
    end if;

    -- Produto (revalida existencia; nao inventa decisao)
    if v_product_id is not null then
      if not exists (select 1 from public.products p where p.id = v_product_id) then
        select p.id into v_product_id from public.products p where p.sku = v_sku limit 1;
      end if;
    else
      select p.id into v_product_id from public.products p where p.sku = v_sku limit 1;
    end if;

    -- Frente B: NUNCA cria produto. SKU inexistente = erro.
    v_create_product := false;
    if v_product_id is not null then
      v_existing_products := v_existing_products + 1;
    else
      raise exception 'Linha %: produto nao cadastrado — importe o cadastro primeiro', r.line_number
        using errcode = 'P0001';
    end if;

    -- Montadora
    if v_manufacturer_id is not null then
      if not exists (select 1 from public.manufacturers m where m.id = v_manufacturer_id) then
        v_manufacturer_id := null;
      end if;
    end if;
    if v_manufacturer_id is null then
      select m.id into v_manufacturer_id
      from public.manufacturers m
      where lower(public.f_unaccent(m.name)) = lower(public.f_unaccent(v_montadora))
         or m.slug = public.slug_from_name(v_montadora)
      limit 1;
    end if;

    if v_manufacturer_id is not null then
      v_existing_manufacturers := v_existing_manufacturers + 1;
    elsif v_create_manufacturer then
      v_base_slug := public.slug_from_name(v_montadora);
      v_slug := v_base_slug;
      v_n := 0;
      while exists (select 1 from public.manufacturers where slug = v_slug) loop
        v_n := v_n + 1;
        v_slug := left(v_base_slug, 70) || '-' || v_n::text;
        if v_n > 50 then
          v_slug := left(v_base_slug, 50) || '-' || replace(gen_random_uuid()::text, '-', '');
          exit;
        end if;
      end loop;
      insert into public.manufacturers (name, slug, status)
      values (v_montadora, v_slug, 'active')
      returning id into v_manufacturer_id;
      v_created_manufacturers := v_created_manufacturers + 1;
    else
      raise exception 'Linha %: montadora nao encontrada e criacao nao aprovada', r.line_number
        using errcode = 'P0001';
    end if;

    -- Modelo
    if v_model_id is not null then
      if not exists (
        select 1 from public.models m
        where m.id = v_model_id and m.manufacturer_id = v_manufacturer_id
      ) then
        v_model_id := null;
      end if;
    end if;
    if v_model_id is null then
      select m.id into v_model_id
      from public.models m
      where m.manufacturer_id = v_manufacturer_id
        and (
          lower(public.f_unaccent(m.name)) = lower(public.f_unaccent(v_modelo))
          or m.slug = public.slug_from_name(v_modelo)
        )
      limit 1;
    end if;

    if v_model_id is not null then
      v_existing_models := v_existing_models + 1;
    elsif v_create_model then
      v_base_slug := public.slug_from_name(v_modelo);
      v_slug := v_base_slug;
      v_n := 0;
      while exists (
        select 1 from public.models
        where manufacturer_id = v_manufacturer_id and slug = v_slug
      ) loop
        v_n := v_n + 1;
        v_slug := left(v_base_slug, 70) || '-' || v_n::text;
        if v_n > 50 then
          v_slug := left(v_base_slug, 50) || '-' || replace(gen_random_uuid()::text, '-', '');
          exit;
        end if;
      end loop;
      insert into public.models (manufacturer_id, name, slug, status)
      values (v_manufacturer_id, v_modelo, v_slug, 'active')
      returning id into v_model_id;
      v_created_models := v_created_models + 1;
    else
      raise exception 'Linha %: modelo nao encontrado e criacao nao aprovada', r.line_number
        using errcode = 'P0001';
    end if;

    -- Versao: nunca escolher arbitrariamente se multiplas
    if v_vv_id is not null then
      if not exists (
        select 1 from public.vehicle_versions vv
        where vv.id = v_vv_id
          and vv.manufacturer_id = v_manufacturer_id
          and vv.model_id = v_model_id
      ) then
        v_vv_id := null;
      end if;
    end if;

    if v_vv_id is null then
      select count(*)::int into v_match_count
      from public.vehicle_versions vv
      where vv.manufacturer_id = v_manufacturer_id
        and vv.model_id = v_model_id
        and lower(public.f_unaccent(coalesce(vv.version_name, '')))
            = lower(public.f_unaccent(coalesce(v_versao, '')));

      if v_match_count > 1 then
        -- Preferir VV ja ligada ao produto
        select vv.id into v_vv_id
        from public.vehicle_versions vv
        join public.product_vehicle_compatibility pvc
          on pvc.vehicle_version_id = vv.id and pvc.product_id = v_product_id
        where vv.manufacturer_id = v_manufacturer_id
          and vv.model_id = v_model_id
          and lower(public.f_unaccent(coalesce(vv.version_name, '')))
              = lower(public.f_unaccent(coalesce(v_versao, '')))
        limit 1;

        if v_vv_id is null then
          raise exception 'Linha %: versoes duplicadas — precisa de revisao', r.line_number
            using errcode = 'P0001';
        end if;
      elsif v_match_count = 1 then
        select vv.id into v_vv_id
        from public.vehicle_versions vv
        where vv.manufacturer_id = v_manufacturer_id
          and vv.model_id = v_model_id
          and lower(public.f_unaccent(coalesce(vv.version_name, '')))
              = lower(public.f_unaccent(coalesce(v_versao, '')))
        limit 1;
      end if;
    end if;

    if v_vv_id is not null then
      v_existing_versions := v_existing_versions + 1;
    elsif v_create_version then
      insert into public.vehicle_versions (
        manufacturer_id, model_id, year, engine, version_name, status
      ) values (
        v_manufacturer_id, v_model_id, v_year_start, null,
        nullif(v_versao, ''), 'active'
      )
      returning id into v_vv_id;
      v_created_versions := v_created_versions + 1;
    else
      raise exception 'Linha %: versao nao encontrada e criacao nao aprovada', r.line_number
        using errcode = 'P0001';
    end if;

    -- PVC: periodo e a fonte de verdade (year_start/year_end)
    select pvc.year_start, pvc.year_end
      into v_exist_start, v_exist_end
    from public.product_vehicle_compatibility pvc
    where pvc.product_id = v_product_id
      and pvc.vehicle_version_id = v_vv_id;

    if found then
      if v_period_action = 'noop_covered' or v_action = 'already_covered' then
        v_already_covered := v_already_covered + 1;
        update public.import_items
        set result = 'already_covered',
            payload = coalesce(r.payload, '{}'::jsonb) || jsonb_build_object(
              'product_id', v_product_id,
              'manufacturer_id', v_manufacturer_id,
              'model_id', v_model_id,
              'vehicle_version_id', v_vv_id
            )
        where id = r.id;
      elsif v_period_action in ('expand', 'close_open_end', 'create')
            or v_action = 'update' then
        -- merge periodos (fim null = vigente)
        v_new_start := case
          when v_exist_start is null then v_year_start
          when v_year_start is null then v_exist_start
          else least(v_exist_start, v_year_start)
        end;
        v_new_end := case
          when v_exist_end is null or v_year_end is null then null
          else greatest(v_exist_end, v_year_end)
        end;
        if v_period_action = 'close_open_end' and v_year_end is not null then
          v_new_end := v_year_end;
          v_new_start := coalesce(least(v_exist_start, v_year_start), v_year_start);
        end if;

        update public.product_vehicle_compatibility
        set year_start = v_new_start,
            year_end = v_new_end
        where product_id = v_product_id
          and vehicle_version_id = v_vv_id;

        v_updated_applications := v_updated_applications + 1;
        update public.import_items
        set result = 'updated',
            payload = coalesce(r.payload, '{}'::jsonb) || jsonb_build_object(
              'product_id', v_product_id,
              'manufacturer_id', v_manufacturer_id,
              'model_id', v_model_id,
              'vehicle_version_id', v_vv_id,
              'year_start', v_new_start,
              'year_end', v_new_end
            )
        where id = r.id;
      elsif v_period_action = 'review_gap' then
        raise exception 'Linha %: lacuna de periodo — precisa de revisao', r.line_number
          using errcode = 'P0001';
      else
        v_already_covered := v_already_covered + 1;
        update public.import_items set result = 'already_covered' where id = r.id;
      end if;
    else
      insert into public.product_vehicle_compatibility (
        product_id, vehicle_version_id, year_start, year_end, notes
      ) values (
        v_product_id, v_vv_id, v_year_start, v_year_end, null
      );
      v_created_applications := v_created_applications + 1;
      update public.import_items
      set result = 'created',
          payload = coalesce(r.payload, '{}'::jsonb) || jsonb_build_object(
            'product_id', v_product_id,
            'manufacturer_id', v_manufacturer_id,
            'model_id', v_model_id,
            'vehicle_version_id', v_vv_id
          )
      where id = r.id;
    end if;
  end loop;

  update public.imports
  set
    status = 'done',
    report = jsonb_build_object(
      'created_products', v_created_products,
      'existing_products', v_existing_products,
      'created_manufacturers', v_created_manufacturers,
      'existing_manufacturers', v_existing_manufacturers,
      'created_models', v_created_models,
      'existing_models', v_existing_models,
      'created_versions', v_created_versions,
      'existing_versions', v_existing_versions,
      'created_applications', v_created_applications,
      'updated_applications', v_updated_applications,
      'already_covered', v_already_covered,
      'skipped_review', v_skipped_review,
      'skipped_error', v_skipped_error,
      'total_processed', v_total
    )
  where id = p_import_id;

  return jsonb_build_object(
    'created_products', v_created_products,
    'existing_products', v_existing_products,
    'created_manufacturers', v_created_manufacturers,
    'existing_manufacturers', v_existing_manufacturers,
    'created_models', v_created_models,
    'existing_models', v_existing_models,
    'created_versions', v_created_versions,
    'existing_versions', v_existing_versions,
    'created_applications', v_created_applications,
    'updated_applications', v_updated_applications,
    'already_covered', v_already_covered,
    'skipped_review', v_skipped_review,
    'skipped_error', v_skipped_error,
    'total_processed', v_total
  );
end;
$$;

revoke all on function public.apply_catalog_applications_import(uuid) from public;
grant execute on function public.apply_catalog_applications_import(uuid) to authenticated;

comment on function public.apply_catalog_applications_import is
  'Importacao Inteligente: aplica aplicacoes a partir de import_items congelados; rollback total em falha critica.';
