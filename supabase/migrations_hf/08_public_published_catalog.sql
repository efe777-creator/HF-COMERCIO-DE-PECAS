-- HF: catálogo publicado livre (anon + authenticated).
-- Preço/estoque/pedido continuam desligados no app (features.*).
-- customer_can_see_product = published (ou staff); sem filtro de catálogo B2B.

create or replace function public.customer_can_see_product(p_product_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if public.is_staff() then
    return true;
  end if;

  select status into v_status from public.products where id = p_product_id;
  return v_status is not distinct from 'published';
end;
$$;

revoke all on function public.customer_can_see_product(uuid) from public;
grant execute on function public.customer_can_see_product(uuid) to anon, authenticated;

-- Taxonomy / veículos: leitura pública
drop policy if exists manufacturers_select_auth on public.manufacturers;
create policy manufacturers_select_public on public.manufacturers
  for select to anon, authenticated using (true);

drop policy if exists models_select_auth on public.models;
create policy models_select_public on public.models
  for select to anon, authenticated using (true);

drop policy if exists vehicle_versions_select_auth on public.vehicle_versions;
create policy vehicle_versions_select_public on public.vehicle_versions
  for select to anon, authenticated using (true);

drop policy if exists categories_select_auth on public.product_categories;
create policy categories_select_public on public.product_categories
  for select to anon, authenticated
  using (status = 'published' or public.is_staff());

drop policy if exists brands_select_auth on public.product_brands;
create policy brands_select_public on public.product_brands
  for select to anon, authenticated
  using (status = 'active' or public.is_staff());

-- Produtos e satélites
drop policy if exists products_select_visible on public.products;
create policy products_select_visible on public.products
  for select to anon, authenticated
  using (public.is_staff() or public.customer_can_see_product(id));

drop policy if exists product_images_select on public.product_images;
create policy product_images_select on public.product_images
  for select to anon, authenticated
  using (public.is_staff() or public.customer_can_see_product(product_id));

drop policy if exists product_references_select on public.product_references;
create policy product_references_select on public.product_references
  for select to anon, authenticated
  using (public.is_staff() or public.customer_can_see_product(product_id));

drop policy if exists pvc_select on public.product_vehicle_compatibility;
create policy pvc_select on public.product_vehicle_compatibility
  for select to anon, authenticated
  using (public.is_staff() or public.customer_can_see_product(product_id));

-- Busca RPC para visitante
grant execute on function public.search_products(
  text, text, text, text, text, text, text, text, text, integer, integer
) to anon, authenticated;

grant execute on function public.is_staff() to anon, authenticated;

comment on function public.customer_can_see_product(uuid) is
  'HF: published visível a anon/authenticated; draft só staff. Catálogo B2B por cliente desligado.';
