-- Fase 3 Módulo 1: evoluir schema F2 + Storage + policies staff write-only no repo.
-- Não recria tabelas. Idempotente onde possível.

-- ---------------------------------------------------------------------------
-- products: colunas comerciais
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists short_description text;

alter table public.products
  add column if not exists supplier_id uuid references public.suppliers (id) on delete set null;

alter table public.products
  add column if not exists attrs jsonb not null default '{}'::jsonb;

create index if not exists products_supplier_idx on public.products (supplier_id);

-- ---------------------------------------------------------------------------
-- product_references: fabricante da ref + status
-- ---------------------------------------------------------------------------
alter table public.product_references
  add column if not exists brand_id uuid references public.product_brands (id) on delete set null;

alter table public.product_references
  add column if not exists status text not null default 'active';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'product_references_status_check'
  ) then
    alter table public.product_references
      add constraint product_references_status_check
      check (status in ('active', 'inactive'));
  end if;
end $$;

-- Public refs: só refs ativas de produtos published (evolui policy F2)
drop policy if exists product_references_public_read on public.product_references;
create policy product_references_public_read on public.product_references
  for select using (
    status = 'active'
    and exists (
      select 1 from public.products p
      where p.id = product_id and p.status = 'published'
    )
  );

-- ---------------------------------------------------------------------------
-- Staff policies: write-only (nunca FOR ALL com is_staff em tabelas de catálogo)
-- Remoto já pode ter policies *_staff_*; repo F2 ainda tinha FOR ALL — normaliza.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'manufacturers',
    'models',
    'vehicle_versions',
    'product_categories',
    'product_brands',
    'products',
    'product_images',
    'product_references',
    'product_vehicle_compatibility',
    'suppliers',
    'supplier_products'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists %I on public.%I', t || '_staff_write', t);
    -- nomes legados possíveis
    execute format('drop policy if exists %I on public.%I', replace(t, 'product_', '') || '_staff_write', t);
  end loop;
end $$;

drop policy if exists manufacturers_staff_write on public.manufacturers;
drop policy if exists models_staff_write on public.models;
drop policy if exists vehicle_versions_staff_write on public.vehicle_versions;
drop policy if exists categories_staff_write on public.product_categories;
drop policy if exists brands_staff_write on public.product_brands;
drop policy if exists products_staff_write on public.products;
drop policy if exists product_images_staff_write on public.product_images;
drop policy if exists product_references_staff_write on public.product_references;
drop policy if exists pvc_staff_write on public.product_vehicle_compatibility;
drop policy if exists suppliers_staff on public.suppliers;
drop policy if exists supplier_products_staff on public.supplier_products;

-- Helper: create select/insert/update/delete staff policies if missing
create or replace function public.__fase3_ensure_staff_policies(p_table regclass, p_prefix text)
returns void
language plpgsql
as $$
begin
  execute format(
    'drop policy if exists %I on %s; create policy %I on %s for select to authenticated using (public.is_staff())',
    p_prefix || '_staff_select', p_table, p_prefix || '_staff_select', p_table
  );
  execute format(
    'drop policy if exists %I on %s; create policy %I on %s for insert to authenticated with check (public.is_staff())',
    p_prefix || '_staff_insert', p_table, p_prefix || '_staff_insert', p_table
  );
  execute format(
    'drop policy if exists %I on %s; create policy %I on %s for update to authenticated using (public.is_staff()) with check (public.is_staff())',
    p_prefix || '_staff_update', p_table, p_prefix || '_staff_update', p_table
  );
  execute format(
    'drop policy if exists %I on %s; create policy %I on %s for delete to authenticated using (public.is_staff())',
    p_prefix || '_staff_delete', p_table, p_prefix || '_staff_delete', p_table
  );
end;
$$;

select public.__fase3_ensure_staff_policies('public.manufacturers', 'manufacturers');
select public.__fase3_ensure_staff_policies('public.models', 'models');
select public.__fase3_ensure_staff_policies('public.vehicle_versions', 'vehicle_versions');
select public.__fase3_ensure_staff_policies('public.product_categories', 'categories');
select public.__fase3_ensure_staff_policies('public.product_brands', 'brands');
select public.__fase3_ensure_staff_policies('public.products', 'products');
select public.__fase3_ensure_staff_policies('public.product_images', 'product_images');
select public.__fase3_ensure_staff_policies('public.product_references', 'product_references');
select public.__fase3_ensure_staff_policies('public.product_vehicle_compatibility', 'pvc');
select public.__fase3_ensure_staff_policies('public.suppliers', 'suppliers');
select public.__fase3_ensure_staff_policies('public.supplier_products', 'supplier_products');

drop function public.__fase3_ensure_staff_policies(regclass, text);

-- Inventory permanece staff-only (FOR ALL ok: sem policy pública de SELECT)
drop policy if exists inventory_staff on public.inventory;
drop policy if exists inventory_staff_all on public.inventory;
create policy inventory_staff_all on public.inventory
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists inventory_movements_staff on public.inventory_movements;
drop policy if exists inventory_movements_staff_all on public.inventory_movements;
create policy inventory_movements_staff_all on public.inventory_movements
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Grants DML catálogo para authenticated (RLS restringe a staff)
grant select, insert, update, delete on public.manufacturers to authenticated;
grant select, insert, update, delete on public.models to authenticated;
grant select, insert, update, delete on public.vehicle_versions to authenticated;
grant select, insert, update, delete on public.product_categories to authenticated;
grant select, insert, update, delete on public.product_brands to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.product_images to authenticated;
grant select, insert, update, delete on public.product_references to authenticated;
grant select, insert, update, delete on public.product_vehicle_compatibility to authenticated;
grant select, insert, update, delete on public.suppliers to authenticated;
grant select, insert, update, delete on public.supplier_products to authenticated;
grant select, insert, update, delete on public.inventory to authenticated;
grant select, insert, update, delete on public.inventory_movements to authenticated;

-- Anon: apenas SELECT (revoga DML se herdado)
revoke insert, update, delete, truncate, references, trigger on public.products from anon;
revoke insert, update, delete, truncate, references, trigger on public.product_references from anon;
revoke insert, update, delete, truncate, references, trigger on public.product_categories from anon;
revoke insert, update, delete, truncate, references, trigger on public.product_brands from anon;
revoke insert, update, delete, truncate, references, trigger on public.product_images from anon;
revoke insert, update, delete, truncate, references, trigger on public.product_vehicle_compatibility from anon;
revoke insert, update, delete, truncate, references, trigger on public.manufacturers from anon;
revoke insert, update, delete, truncate, references, trigger on public.models from anon;
revoke insert, update, delete, truncate, references, trigger on public.vehicle_versions from anon;
revoke insert, update, delete, truncate, references, trigger on public.suppliers from anon;
revoke insert, update, delete, truncate, references, trigger on public.supplier_products from anon;
revoke insert, update, delete, truncate, references, trigger on public.inventory from anon;
revoke insert, update, delete, truncate, references, trigger on public.inventory_movements from anon;

grant select on public.manufacturers to anon;
grant select on public.models to anon;
grant select on public.vehicle_versions to anon;
grant select on public.product_categories to anon;
grant select on public.product_brands to anon;
grant select on public.products to anon;
grant select on public.product_images to anon;
grant select on public.product_references to anon;
grant select on public.product_vehicle_compatibility to anon;

-- ---------------------------------------------------------------------------
-- Storage: bucket product-images
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists product_images_storage_select on storage.objects;
create policy product_images_storage_select on storage.objects
  for select
  using (bucket_id = 'product-images');

drop policy if exists product_images_storage_insert on storage.objects;
create policy product_images_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_staff());

drop policy if exists product_images_storage_update on storage.objects;
create policy product_images_storage_update on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_staff())
  with check (bucket_id = 'product-images' and public.is_staff());

drop policy if exists product_images_storage_delete on storage.objects;
create policy product_images_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_staff());
