-- F8.1-N PREPARED (NÃO APLICAR sem autorização — sem db push neste gate)
-- Estende apply_catalog_import para ler grupo/montadora do payload no mesmo apply.
-- Até apply remoto, o client faz enrichment pós-RPC (category_id + attrs.montadora_sugerida).

create or replace function public.apply_catalog_import(p_import_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_kind text;
  v_status text;
  v_created int := 0;
  v_updated int := 0;
  v_failed int := 0;
  v_skipped int := 0;
  r record;
  v_sku text;
  v_name text;
  v_grupo text;
  v_montadora text;
  v_product_id uuid;
  v_slug text;
  v_base_slug text;
  v_n int;
  v_category_id uuid;
  v_attrs jsonb;
begin
  if v_uid is null then
    raise exception 'Nao autenticado' using errcode = '42501';
  end if;

  if not public.staff_can_import_catalog() then
    raise exception 'Somente administrador ou gerente pode importar catalogo'
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

  if v_kind is distinct from 'catalog' then
    raise exception 'Importacao nao e do tipo catalog' using errcode = 'P0001';
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
      v_name := nullif(trim(both from coalesce(r.payload ->> 'name', '')), '');
      v_grupo := nullif(trim(both from coalesce(r.payload ->> 'grupo', '')), '');
      v_montadora := nullif(trim(both from coalesce(r.payload ->> 'montadora', '')), '');

      if v_sku is null or v_name is null then
        update public.import_items
        set result = 'error',
            errors = array['SKU ou descricao ausente no payload']
        where id = r.id;
        v_failed := v_failed + 1;
        continue;
      end if;

      v_category_id := null;
      if v_grupo is not null then
        select c.id into v_category_id
        from public.product_categories c
        where lower(c.name) = lower(v_grupo)
        limit 1;
      end if;

      select p.id, coalesce(p.attrs, '{}'::jsonb)
        into v_product_id, v_attrs
      from public.products p
      where p.sku = v_sku
      limit 1;

      if v_montadora is not null then
        v_attrs := coalesce(v_attrs, '{}'::jsonb)
          || jsonb_build_object(
            'montadora_sugerida', v_montadora,
            'montadora_origem', 'import'
          );
      end if;

      if v_product_id is not null then
        update public.products
        set
          name = v_name,
          search_document = lower(v_name || ' ' || v_sku),
          category_id = coalesce(v_category_id, category_id),
          attrs = case when v_montadora is not null then v_attrs else attrs end,
          updated_at = now()
        where id = v_product_id;
        -- NÃO altera status / is_available / price / product_vehicle_compatibility

        update public.import_items
        set result = 'updated',
            payload = coalesce(r.payload, '{}'::jsonb) || jsonb_build_object(
              'product_id', v_product_id,
              'action', 'updated'
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
          sku, name, slug, description, price, status, is_available, is_incomplete,
          search_document, category_id, attrs
        ) values (
          v_sku,
          v_name,
          v_slug,
          null,
          0,
          'draft',
          false,
          true,
          lower(v_name || ' ' || v_sku),
          v_category_id,
          case when v_montadora is not null then v_attrs else '{}'::jsonb end
        )
        returning id into v_product_id;

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
          errors = array[sqlerrm]
      where id = r.id;
      v_failed := v_failed + 1;
    end;
  end loop;

  update public.imports
  set status = 'done',
      report = coalesce(report, '{}'::jsonb) || jsonb_build_object(
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

comment on function public.apply_catalog_import(uuid) is
  'F8.1-N PREPARED: catalog import com grupo/montadora. NAO aplicar via db push sem autorizacao.';
