-- Fix: public catalog RLS must not call is_staff() (anon lacks EXECUTE).
-- Staff still sees drafts via FOR ALL policies.

drop policy if exists manufacturers_public_read on public.manufacturers;
create policy manufacturers_public_read on public.manufacturers
  for select using (status = 'active');

drop policy if exists models_public_read on public.models;
create policy models_public_read on public.models
  for select using (status = 'active');

drop policy if exists vehicle_versions_public_read on public.vehicle_versions;
create policy vehicle_versions_public_read on public.vehicle_versions
  for select using (status = 'active');

drop policy if exists categories_public_read on public.product_categories;
create policy categories_public_read on public.product_categories
  for select using (status = 'published');

drop policy if exists brands_public_read on public.product_brands;
create policy brands_public_read on public.product_brands
  for select using (status = 'active');

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select using (status = 'published');

drop policy if exists product_images_public_read on public.product_images;
create policy product_images_public_read on public.product_images
  for select using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.status = 'published'
    )
  );

drop policy if exists product_references_public_read on public.product_references;
create policy product_references_public_read on public.product_references
  for select using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.status = 'published'
    )
  );

drop policy if exists pvc_public_read on public.product_vehicle_compatibility;
create policy pvc_public_read on public.product_vehicle_compatibility
  for select using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.status = 'published'
    )
  );

grant execute on function public.is_staff() to authenticated;
grant execute on function public.current_customer_id() to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.sync_product_availability() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
