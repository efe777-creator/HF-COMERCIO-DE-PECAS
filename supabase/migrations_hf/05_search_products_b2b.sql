-- HF: search_products com assinatura do frontend + filtro customer_can_see_product
drop function if exists public.search_products(text, integer, integer);
drop function if exists public.search_products(
  text, text, text, text, text, text, text, text, text, integer, integer
);

create or replace function public.search_products(
  p_q text default null,
  p_category text default null,
  p_brand text default null,
  p_maker text default null,
  p_model text default null,
  p_year text default null,
  p_engine text default null,
  p_version text default null,
  p_sort text default 'relevance',
  p_page integer default 1,
  p_page_size integer default 24
)
returns table (
  id uuid,
  sku text,
  name text,
  slug text,
  description text,
  short_description text,
  price numeric,
  promo_price numeric,
  status text,
  manufacturer_code text,
  is_available boolean,
  is_incomplete boolean,
  category_id uuid,
  brand_id uuid,
  supplier_id uuid,
  attrs jsonb,
  brand_name text,
  category_name text,
  relevance_score numeric,
  total_count bigint
)
language plpgsql
stable
security invoker
set search_path = public, extensions
as $$
declare
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := least(greatest(coalesce(p_page_size, 24), 1), 100);
  v_offset integer;
  v_sort text := coalesce(nullif(trim(p_sort), ''), 'relevance');
  v_q text := nullif(trim(p_q), '');
  v_category text := nullif(trim(p_category), '');
  v_brand text := nullif(trim(p_brand), '');
  v_maker text := nullif(trim(p_maker), '');
  v_model text := nullif(trim(p_model), '');
  v_year text := nullif(trim(p_year), '');
  v_engine text := nullif(trim(p_engine), '');
  v_version text := nullif(trim(p_version), '');
  v_terms text[];
begin
  v_offset := (v_page - 1) * v_page_size;

  if v_sort not in ('relevance', 'price_asc', 'price_desc', 'name_asc', 'name_desc') then
    v_sort := 'relevance';
  end if;

  if v_q is not null then
    select coalesce(array_agg(t), '{}'::text[])
    into v_terms
    from (
      select lower(public.f_unaccent(term)) as t
      from unnest(regexp_split_to_array(v_q, '\s+')) as term
      where length(trim(term)) > 0
    ) s
    where t <> '';
  else
    v_terms := '{}'::text[];
  end if;

  return query
  with recursive
  cat_ids as (
    select c.id
    from public.product_categories c
    where v_category is not null
      and (
        c.id::text = v_category
        or c.slug = v_category
        or lower(c.name) = lower(v_category)
      )
    union
    select child.id
    from public.product_categories child
    join cat_ids parent on child.parent_id = parent.id
  ),
  vehicle_product_ids as (
    select distinct pvc.product_id
    from public.product_vehicle_compatibility pvc
    join public.vehicle_versions vv on vv.id = pvc.vehicle_version_id
    join public.manufacturers mk on mk.id = vv.manufacturer_id
    join public.models md on md.id = vv.model_id
    where (v_maker is not null or v_model is not null or v_year is not null
           or v_engine is not null or v_version is not null)
      and vv.status = 'active'
      and (v_maker is null or lower(mk.name) = lower(v_maker))
      and (v_model is null or lower(md.name) = lower(v_model))
      and (v_year is null or vv.year = v_year::integer)
      and (v_engine is null or vv.engine = v_engine)
      and (v_version is null or vv.version_name = v_version)
  ),
  scored as (
    select
      p.id,
      p.sku,
      p.name,
      p.slug,
      p.description,
      p.short_description,
      p.price,
      p.promo_price,
      p.status,
      p.manufacturer_code,
      p.is_available,
      p.is_incomplete,
      p.category_id,
      p.brand_id,
      p.supplier_id,
      p.attrs,
      pb.name as brand_name,
      pc.name as category_name,
      case
        when cardinality(v_terms) = 0 then 0::numeric
        else (
          select coalesce(sum(term_score), 0)
          from (
            select
              greatest(
                case when lower(public.f_unaccent(p.sku)) = t then 1000 else 0 end,
                case
                  when exists (
                    select 1 from public.product_references pr
                    where pr.product_id = p.id and pr.status = 'active'
                      and lower(public.f_unaccent(pr.code)) = t
                  ) then 800 else 0
                end,
                case
                  when exists (
                    select 1 from public.product_references pr
                    where pr.product_id = p.id and pr.status = 'active'
                      and lower(public.f_unaccent(pr.code)) like '%' || t || '%'
                  ) then 600 else 0
                end,
                case when lower(public.f_unaccent(p.name)) like '%' || t || '%' then 400 else 0 end,
                case
                  when lower(public.f_unaccent(coalesce(p.search_document, ''))) like '%' || t || '%'
                    or lower(public.f_unaccent(coalesce(p.manufacturer_code, ''))) like '%' || t || '%'
                    or lower(public.f_unaccent(coalesce(pb.name, ''))) like '%' || t || '%'
                  then 200 else 0
                end
              ) as term_score
            from unnest(v_terms) as t
          ) scores
        )
      end as relevance_score
    from public.products p
    left join public.product_brands pb on pb.id = p.brand_id
    left join public.product_categories pc on pc.id = p.category_id
    where p.status = 'published'
      and public.customer_can_see_product(p.id)
      and (
        v_category is null
        or p.category_id in (select cat_ids.id from cat_ids)
      )
      and (
        v_brand is null
        or pb.id::text = v_brand
        or lower(pb.name) = lower(v_brand)
      )
      and (
        v_maker is null and v_model is null and v_year is null
          and v_engine is null and v_version is null
        or p.id in (select vehicle_product_ids.product_id from vehicle_product_ids)
      )
      and (
        cardinality(v_terms) = 0
        or (
          select bool_and(matched)
          from (
            select (
              lower(public.f_unaccent(p.sku)) like '%' || t || '%'
              or lower(public.f_unaccent(p.name)) like '%' || t || '%'
              or lower(public.f_unaccent(coalesce(p.search_document, ''))) like '%' || t || '%'
              or lower(public.f_unaccent(coalesce(p.manufacturer_code, ''))) like '%' || t || '%'
              or lower(public.f_unaccent(coalesce(pb.name, ''))) like '%' || t || '%'
              or exists (
                select 1 from public.product_references pr
                where pr.product_id = p.id and pr.status = 'active'
                  and lower(public.f_unaccent(pr.code)) like '%' || t || '%'
              )
            ) as matched
            from unnest(v_terms) as t
          ) m
        )
      )
  ),
  ordered as (
    select
      s.*,
      count(*) over () as total_count
    from scored s
    order by
      case when v_sort = 'relevance' then s.relevance_score end desc nulls last,
      case when v_sort = 'price_asc' then s.price end asc nulls last,
      case when v_sort = 'price_desc' then s.price end desc nulls last,
      case when v_sort = 'name_desc' then s.name end desc nulls last,
      s.name asc
    limit v_page_size
    offset v_offset
  )
  select
    o.id, o.sku, o.name, o.slug, o.description, o.short_description,
    o.price, o.promo_price, o.status, o.manufacturer_code,
    o.is_available, o.is_incomplete, o.category_id, o.brand_id, o.supplier_id,
    o.attrs, o.brand_name, o.category_name, o.relevance_score, o.total_count
  from ordered o;
end;
$$;

revoke all on function public.search_products(
  text, text, text, text, text, text, text, text, text, integer, integer
) from public;

grant execute on function public.search_products(
  text, text, text, text, text, text, text, text, text, integer, integer
) to authenticated;

comment on function public.search_products is
  'HF B2B: busca publicada com ranking/filtros + customer_can_see_product (authenticated).';
