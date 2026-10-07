-- HF F1: RLS + grants
alter table public.profiles enable row level security;
alter table public.manufacturers enable row level security;
alter table public.models enable row level security;
alter table public.vehicle_versions enable row level security;
alter table public.product_categories enable row level security;
alter table public.product_brands enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_references enable row level security;
alter table public.product_vehicle_compatibility enable row level security;
alter table public.supplier_products enable row level security;
alter table public.imports enable row level security;
alter table public.import_items enable row level security;
alter table public.import_profiles enable row level security;
alter table public.customer_groups enable row level security;
alter table public.customers enable row level security;
alter table public.customer_users enable row level security;
alter table public.catalogs enable row level security;
alter table public.catalog_products enable row level security;
alter table public.customer_group_catalogs enable row level security;
alter table public.customer_catalogs enable row level security;

create policy profiles_select_own_or_staff on public.profiles
  for select using (id = auth.uid() or public.is_staff());
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid() or public.is_staff());

create policy manufacturers_select_auth on public.manufacturers
  for select to authenticated using (true);
create policy manufacturers_write_staff on public.manufacturers
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy models_select_auth on public.models
  for select to authenticated using (true);
create policy models_write_staff on public.models
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy vehicle_versions_select_auth on public.vehicle_versions
  for select to authenticated using (true);
create policy vehicle_versions_write_staff on public.vehicle_versions
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy categories_select_auth on public.product_categories
  for select to authenticated using (status = 'published' or public.is_staff());
create policy categories_write_staff on public.product_categories
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy brands_select_auth on public.product_brands
  for select to authenticated using (status = 'active' or public.is_staff());
create policy brands_write_staff on public.product_brands
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy suppliers_staff on public.suppliers
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy products_select_visible on public.products
  for select to authenticated
  using (public.is_staff() or public.customer_can_see_product(id));
create policy products_write_staff on public.products
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy product_images_select on public.product_images
  for select to authenticated
  using (public.is_staff() or public.customer_can_see_product(product_id));
create policy product_images_write_staff on public.product_images
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy product_references_select on public.product_references
  for select to authenticated
  using (public.is_staff() or public.customer_can_see_product(product_id));
create policy product_references_write_staff on public.product_references
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy pvc_select on public.product_vehicle_compatibility
  for select to authenticated
  using (public.is_staff() or public.customer_can_see_product(product_id));
create policy pvc_write_staff on public.product_vehicle_compatibility
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy supplier_products_staff on public.supplier_products
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy imports_staff on public.imports
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy import_items_staff on public.import_items
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy import_profiles_staff on public.import_profiles
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy customer_groups_staff on public.customer_groups
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy customers_select on public.customers
  for select to authenticated
  using (public.is_staff() or id in (select public.current_customer_ids()));
create policy customers_write_staff on public.customers
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy customer_users_select on public.customer_users
  for select to authenticated
  using (public.is_staff() or profile_id = auth.uid());
create policy customer_users_write_staff on public.customer_users
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy catalogs_select on public.catalogs
  for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.customer_catalogs cc
      where cc.catalog_id = catalogs.id
        and cc.customer_id in (select public.current_customer_ids())
    )
    or exists (
      select 1
      from public.customers c
      join public.customer_group_catalogs cgc on cgc.group_id = c.group_id
      where c.id in (select public.current_customer_ids())
        and cgc.catalog_id = catalogs.id
    )
  );
create policy catalogs_write_staff on public.catalogs
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy catalog_products_select on public.catalog_products
  for select to authenticated
  using (public.is_staff() or public.customer_can_see_product(product_id));
create policy catalog_products_write_staff on public.catalog_products
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy customer_group_catalogs_staff on public.customer_group_catalogs
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy customer_catalogs_select on public.customer_catalogs
  for select to authenticated
  using (public.is_staff() or customer_id in (select public.current_customer_ids()));
create policy customer_catalogs_write_staff on public.customer_catalogs
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

grant usage on schema public to anon, authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.customer_can_see_product(uuid) to authenticated;
grant execute on function public.current_customer_ids() to authenticated;
grant execute on function public.search_products(text, int, int) to authenticated;
