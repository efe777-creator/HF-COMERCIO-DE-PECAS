-- Fase 3 Módulo 11: produtos comerciais de validação + arquivar fixtures F2.
-- Usa modelo Palio seed + versões 1.0 Fire e 1.4 (fonte: seed F2 + extensão controlada).

-- Garantir versão Palio 1.4 para teste de não-contaminação
insert into public.vehicle_versions (id, manufacturer_id, model_id, year, engine, version_name, status)
values (
  '55555555-5555-5555-5555-555555555010',
  '33333333-3333-3333-3333-333333333001',
  '44444444-4444-4444-4444-444444444001',
  null,
  '1.4',
  null,
  'active'
)
on conflict (id) do update set engine = excluded.engine, status = 'active';

-- Versão parcial Palio 1.0 sem ano (NULL estrito)
insert into public.vehicle_versions (id, manufacturer_id, model_id, year, engine, version_name, status)
values (
  '55555555-5555-5555-5555-555555555011',
  '33333333-3333-3333-3333-333333333001',
  '44444444-4444-4444-4444-444444444001',
  null,
  '1.0',
  'Fire',
  'active'
)
on conflict (id) do update set engine = excluded.engine, version_name = excluded.version_name, status = 'active';

-- Produto A: Palio 1.0 Fire + ref PVI1032 + SKU TEST-001
insert into public.products (
  id, sku, name, slug, short_description, description, brand_id, supplier_id, category_id,
  price, promo_price, status, search_document, is_incomplete, is_available, attrs
)
select
  'c6666666-6666-6666-6666-666666666001',
  'TEST-001',
  'Pivô Suspensão Palio 1.0 Fire',
  'pivo-suspensao-palio-10-fire',
  'Pivô para Palio 1.0 Fire',
  'Produto comercial de validação Fase 3.',
  b.id,
  'b2222222-2222-2222-2222-222222222001',
  'a1111111-1111-1111-1111-111111111011',
  129.90,
  null,
  'published',
  'pivo suspensao palio 1.0 fire test-001 pvi1032 nakata',
  true,
  true,
  '{}'::jsonb
from public.product_brands b
where b.slug = 'nakata'
on conflict (id) do update set
  sku = excluded.sku,
  name = excluded.name,
  status = 'published',
  category_id = excluded.category_id,
  brand_id = excluded.brand_id,
  short_description = excluded.short_description,
  is_available = true;

-- Produto B: Palio 1.4 (não deve aparecer no filtro 1.0)
insert into public.products (
  id, sku, name, slug, short_description, description, brand_id, supplier_id, category_id,
  price, status, search_document, is_incomplete, is_available, attrs
)
select
  'c6666666-6666-6666-6666-666666666002',
  'TEST-002',
  'Pivô Suspensão Palio 1.4',
  'pivo-suspensao-palio-14',
  'Pivô para Palio 1.4',
  'Produto comercial de validação Fase 3 — aplicação 1.4.',
  b.id,
  'b2222222-2222-2222-2222-222222222001',
  'a1111111-1111-1111-1111-111111111011',
  139.90,
  'published',
  'pivo suspensao palio 1.4 test-002',
  true,
  true,
  '{}'::jsonb
from public.product_brands b
where b.slug = 'nakata'
on conflict (id) do update set
  sku = excluded.sku,
  name = excluded.name,
  status = 'published',
  is_available = true;

insert into public.product_references (product_id, code, ref_type, brand_label, status)
values
  ('c6666666-6666-6666-6666-666666666001', 'TEST-001', 'internal', 'FAL', 'active'),
  ('c6666666-6666-6666-6666-666666666001', 'PVI1032', 'manufacturer', 'Nakata', 'active'),
  ('c6666666-6666-6666-6666-666666666002', 'TEST-002', 'internal', 'FAL', 'active')
on conflict (product_id, code, ref_type) do update set status = 'active';

insert into public.product_vehicle_compatibility (product_id, vehicle_version_id, notes)
values
  ('c6666666-6666-6666-6666-666666666001', '55555555-5555-5555-5555-555555555011', 'Palio 1.0 Fire'),
  ('c6666666-6666-6666-6666-666666666001', '55555555-5555-5555-5555-555555555001', 'Palio 2015 1.0 Fire seed'),
  ('c6666666-6666-6666-6666-666666666002', '55555555-5555-5555-5555-555555555010', 'Palio 1.4')
on conflict (product_id, vehicle_version_id) do nothing;

insert into public.inventory (product_id, quantity_on_hand, quantity_reserved) values
  ('c6666666-6666-6666-6666-666666666001', 20, 0),
  ('c6666666-6666-6666-6666-666666666002', 15, 0)
on conflict (product_id) do update set quantity_on_hand = excluded.quantity_on_hand;

-- Arquivar fixtures F2 (não são catálogo comercial)
update public.products
set status = 'archived'
where id in (
  '66666666-6666-6666-6666-666666666001',
  '66666666-6666-6666-6666-666666666002'
);

-- Fabricante seed F2 fora do filtro público
update public.product_brands
set status = 'inactive'
where slug = 'fal-seed';
