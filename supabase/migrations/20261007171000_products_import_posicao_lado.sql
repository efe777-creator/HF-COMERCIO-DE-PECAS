-- Evolui apply_catalog_products_import: grava posicao/lado do payload congelado.

create or replace function public.apply_catalog_products_import(p_import_id uuid)
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
  v_applyable boolean;
  v_sku text;
  v_name text;
  v_categoria text;
  v_grupo text;
  v_subgrupo text;
  v_posicao text;
  v_lado text;
  v_short text;
  v_desc text;
  v_product_id uuid;
  v_cat_id uuid;
  v_grp_id uuid;
  v_sub_id uuid;
  v_leaf_id uuid;
  v_slug text;
  v_base_slug text;
  v_n int;
  v_created int := 0;
  v_updated int := 0;
  v_failed int := 0;
  v_skipped int := 0;
  v_cats_created int := 0;
  v_total int := 0;
begin
  if v_uid is null then
    raise exception 'Nao autenticado' using errcode = '42501';
  end if;
  if not public.staff_can_import_catalog() then
    raise exception 'Somente administrador ou gerente pode importar produtos'
      using errcode = '42501';
  end if;

  select i.kind, i.status into v_kind, v_status
  from public.imports i where i.id = p_import_id for update;

  if not found then
    raise exception 'Importacao nao encontrada' using errcode = 'P0001';
  end if;
  if v_kind is distinct from 'catalog' then
    raise exception 'Importacao nao e do tipo catalog' using errcode = 'P0001';
  end if;
  if v_status in ('done', 'importing', 'failed') then
    raise exception 'Esta importacao ja foi processada (status: %)', v_status
      using errcode = 'P0001';
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
    v_total := v_total + 1;
    if r.result is distinct from 'ok' then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_action := nullif(trim(both from coalesce(r.payload ->> 'action', '')), '');
    v_applyable := coalesce((r.payload ->> 'applyable')::boolean, false);
    if not v_applyable or v_action not in ('create', 'update') then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_sku := nullif(trim(both from coalesce(r.payload ->> 'sku', '')), '');
    v_name := nullif(trim(both from coalesce(r.payload ->> 'name', '')), '');
    v_categoria := nullif(trim(both from coalesce(r.payload ->> 'categoria', '')), '');
    v_grupo := nullif(trim(both from coalesce(r.payload ->> 'grupo', '')), '');
    v_subgrupo := nullif(trim(both from coalesce(r.payload ->> 'subgrupo', '')), '');
    v_posicao := nullif(upper(trim(both from coalesce(r.payload ->> 'posicao', ''))), '');
    v_lado := nullif(upper(trim(both from coalesce(r.payload ->> 'lado', ''))), '');
    v_short := nullif(trim(both from coalesce(r.payload ->> 'descricao_curta', '')), '');
    v_desc := nullif(trim(both from coalesce(r.payload ->> 'descricao', '')), '');
    v_product_id := nullif(r.payload ->> 'product_id', '')::uuid;

    if v_sku is null or v_name is null or v_categoria is null or v_grupo is null then
      raise exception 'Linha %: payload incompleto (sku/nome/categoria/grupo)', r.line_number
        using errcode = 'P0001';
    end if;

    if v_posicao is not null
       and v_posicao !~ '^(DIANTEIRA|TRASEIRA|SUPERIOR|INFERIOR)(_(DIANTEIRA|TRASEIRA|SUPERIOR|INFERIOR)){0,3}$'
    then
      raise exception 'Linha %: posicao invalida (%)', r.line_number, v_posicao
        using errcode = 'P0001';
    end if;
    if v_lado is not null and v_lado not in ('ESQUERDO', 'DIREITO', 'AMBOS') then
      raise exception 'Linha %: lado invalido (%)', r.line_number, v_lado
        using errcode = 'P0001';
    end if;

    -- Categoria raiz
    select c.id into v_cat_id
    from public.product_categories c
    where c.parent_id is null
      and (
        lower(public.f_unaccent(c.name)) = lower(public.f_unaccent(v_categoria))
        or c.slug = public.slug_from_name(v_categoria)
      )
    limit 1;
    if v_cat_id is null then
      v_base_slug := public.slug_from_name(v_categoria);
      v_slug := v_base_slug;
      v_n := 0;
      while exists (select 1 from public.product_categories where slug = v_slug) loop
        v_n := v_n + 1;
        v_slug := left(v_base_slug, 70) || '-' || v_n::text;
        if v_n > 50 then
          v_slug := left(v_base_slug, 50) || '-' || replace(gen_random_uuid()::text, '-', '');
          exit;
        end if;
      end loop;
      insert into public.product_categories (name, slug, parent_id, status)
      values (v_categoria, v_slug, null, 'published')
      returning id into v_cat_id;
      v_cats_created := v_cats_created + 1;
    end if;

    select c.id into v_grp_id
    from public.product_categories c
    where c.parent_id = v_cat_id
      and (
        lower(public.f_unaccent(c.name)) = lower(public.f_unaccent(v_grupo))
        or c.slug = public.slug_from_name(v_grupo)
      )
    limit 1;
    if v_grp_id is null then
      v_base_slug := public.slug_from_name(v_grupo);
      v_slug := v_base_slug;
      v_n := 0;
      while exists (select 1 from public.product_categories where slug = v_slug) loop
        v_n := v_n + 1;
        v_slug := left(v_base_slug, 70) || '-' || v_n::text;
        if v_n > 50 then
          v_slug := left(v_base_slug, 50) || '-' || replace(gen_random_uuid()::text, '-', '');
          exit;
        end if;
      end loop;
      insert into public.product_categories (name, slug, parent_id, status)
      values (v_grupo, v_slug, v_cat_id, 'published')
      returning id into v_grp_id;
      v_cats_created := v_cats_created + 1;
    end if;

    v_sub_id := null;
    if v_subgrupo is not null then
      select c.id into v_sub_id
      from public.product_categories c
      where c.parent_id = v_grp_id
        and (
          lower(public.f_unaccent(c.name)) = lower(public.f_unaccent(v_subgrupo))
          or c.slug = public.slug_from_name(v_subgrupo)
        )
      limit 1;
      if v_sub_id is null then
        v_base_slug := public.slug_from_name(v_subgrupo);
        v_slug := v_base_slug;
        v_n := 0;
        while exists (select 1 from public.product_categories where slug = v_slug) loop
          v_n := v_n + 1;
          v_slug := left(v_base_slug, 70) || '-' || v_n::text;
          if v_n > 50 then
            v_slug := left(v_base_slug, 50) || '-' || replace(gen_random_uuid()::text, '-', '');
            exit;
          end if;
        end loop;
        insert into public.product_categories (name, slug, parent_id, status)
        values (v_subgrupo, v_slug, v_grp_id, 'published')
        returning id into v_sub_id;
        v_cats_created := v_cats_created + 1;
      end if;
    end if;

    v_leaf_id := coalesce(v_sub_id, v_grp_id, v_cat_id);

    if v_product_id is not null then
      if not exists (select 1 from public.products p where p.id = v_product_id) then
        v_product_id := null;
      end if;
    end if;
    if v_product_id is null then
      select p.id into v_product_id from public.products p where p.sku = v_sku limit 1;
    end if;

    if v_product_id is not null then
      update public.products
      set
        name = v_name,
        short_description = v_short,
        description = v_desc,
        category_id = v_leaf_id,
        posicao = v_posicao,
        lado = v_lado,
        search_document = lower(
          v_name || ' ' || v_sku || ' ' || coalesce(v_short, '') || ' ' ||
          coalesce(v_posicao, '') || ' ' || coalesce(v_lado, '')
        ),
        updated_at = now()
      where id = v_product_id;
      update public.import_items
      set result = 'updated',
          payload = coalesce(r.payload, '{}'::jsonb) || jsonb_build_object(
            'product_id', v_product_id,
            'category_id', v_leaf_id,
            'posicao', v_posicao,
            'lado', v_lado
          )
      where id = r.id;
      v_updated := v_updated + 1;
    else
      v_base_slug := public.slug_from_sku(v_sku);
      v_slug := v_base_slug;
      v_n := 0;
      while exists (select 1 from public.products where slug = v_slug) loop
        v_n := v_n + 1;
        v_slug := left(v_base_slug, 70) || '-' || v_n::text;
        if v_n > 100 then
          v_slug := left(v_base_slug, 50) || '-' || replace(gen_random_uuid()::text, '-', '');
          exit;
        end if;
      end loop;

      insert into public.products (
        sku, name, slug, description, short_description, price, status,
        is_available, is_incomplete, category_id, posicao, lado, search_document
      ) values (
        v_sku, v_name, v_slug, v_desc, v_short, 0, 'draft',
        false, true, v_leaf_id, v_posicao, v_lado,
        lower(
          v_name || ' ' || v_sku || ' ' || coalesce(v_short, '') || ' ' ||
          coalesce(v_posicao, '') || ' ' || coalesce(v_lado, '')
        )
      )
      returning id into v_product_id;

      update public.import_items
      set result = 'created',
          payload = coalesce(r.payload, '{}'::jsonb) || jsonb_build_object(
            'product_id', v_product_id,
            'category_id', v_leaf_id,
            'posicao', v_posicao,
            'lado', v_lado
          )
      where id = r.id;
      v_created := v_created + 1;
    end if;
  end loop;

  update public.imports
  set
    status = 'done',
    report = jsonb_build_object(
      'created', v_created,
      'updated', v_updated,
      'failed', v_failed,
      'skipped', v_skipped,
      'categories_created', v_cats_created,
      'total_processed', v_total
    )
  where id = p_import_id;

  return jsonb_build_object(
    'created', v_created,
    'updated', v_updated,
    'failed', v_failed,
    'skipped', v_skipped,
    'categories_created', v_cats_created,
    'total_processed', v_total
  );
end;
$$;

revoke all on function public.apply_catalog_products_import(uuid) from public;
grant execute on function public.apply_catalog_products_import(uuid) to authenticated;

comment on function public.apply_catalog_products_import is
  'Frente A: upsert produtos + hierarquia + posicao/lado; rollback total em falha critica.';
