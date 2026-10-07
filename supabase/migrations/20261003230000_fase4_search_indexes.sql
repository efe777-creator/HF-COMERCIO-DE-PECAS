-- Fase 4 M1: extensão unaccent + índices mínimos para o motor de busca.
-- Não duplica índices já existentes (status, category, sku unique, refs.code, pvc_*, vehicle_versions_filter).

create extension if not exists unaccent with schema extensions;

-- Wrapper estável em public (RPC e queries usam f_unaccent).
create or replace function public.f_unaccent(t text)
returns text
language sql
stable
parallel safe
as $$
  select extensions.unaccent(coalesce(t, ''));
$$;

revoke all on function public.f_unaccent(text) from public;
grant execute on function public.f_unaccent(text) to anon, authenticated;

create index if not exists products_brand_id_idx on public.products (brand_id);

-- Apoia filtros/ilike em search_document (coluna já usada na busca F2/F3).
create index if not exists products_search_document_idx
  on public.products (search_document)
  where search_document is not null and search_document <> '';
