-- HF Storage: bucket de imagens de produto (idempotente).
-- Fonte de verdade: migrations_hf (não aplicar supabase/migrations legado FAL).

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
