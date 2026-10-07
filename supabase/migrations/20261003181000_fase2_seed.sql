-- Seed estrutural Fase 2 (não é catálogo comercial final)
-- Já aplicado no projeto Supabase via MCP; arquivo para reprodutibilidade.

insert into public.product_categories (id, parent_id, name, slug, description, sort_order, status) values
  ('11111111-1111-1111-1111-111111111001', null, 'Suspensão e Direção', 'suspensao-e-direcao', 'Componentes de suspensão e direção', 10, 'published'),
  ('11111111-1111-1111-1111-111111111002', null, 'Fluidos', 'fluidos', 'Óleos e fluidos automotivos', 20, 'published'),
  ('11111111-1111-1111-1111-111111111003', null, 'Filtros', 'filtros', 'Filtros automotivos', 30, 'published')
on conflict (id) do nothing;

insert into public.product_categories (id, parent_id, name, slug, description, sort_order, status) values
  ('11111111-1111-1111-1111-111111111011', '11111111-1111-1111-1111-111111111001', 'Axial', 'axial', null, 1, 'published'),
  ('11111111-1111-1111-1111-111111111012', '11111111-1111-1111-1111-111111111001', 'Bandeja', 'bandeja', null, 2, 'published'),
  ('11111111-1111-1111-1111-111111111013', '11111111-1111-1111-1111-111111111001', 'Bieleta', 'bieleta', null, 3, 'published'),
  ('11111111-1111-1111-1111-111111111014', '11111111-1111-1111-1111-111111111001', 'Pivô', 'pivo', null, 4, 'published'),
  ('11111111-1111-1111-1111-111111111015', '11111111-1111-1111-1111-111111111001', 'Terminal', 'terminal', null, 5, 'published'),
  ('11111111-1111-1111-1111-111111111021', '11111111-1111-1111-1111-111111111002', 'Óleo do motor', 'oleo-do-motor', null, 1, 'published'),
  ('11111111-1111-1111-1111-111111111022', '11111111-1111-1111-1111-111111111002', 'Fluido de freio', 'fluido-de-freio', null, 2, 'published'),
  ('11111111-1111-1111-1111-111111111031', '11111111-1111-1111-1111-111111111003', 'Filtro de óleo', 'filtro-de-oleo', null, 1, 'published'),
  ('11111111-1111-1111-1111-111111111032', '11111111-1111-1111-1111-111111111003', 'Filtro de ar', 'filtro-de-ar', null, 2, 'published')
on conflict (id) do nothing;

insert into public.product_brands (id, name, slug) values
  ('22222222-2222-2222-2222-222222222001', 'FAL Seed', 'fal-seed')
on conflict (id) do nothing;

insert into public.manufacturers (id, name, slug) values
  ('33333333-3333-3333-3333-333333333001', 'Fiat', 'fiat'),
  ('33333333-3333-3333-3333-333333333002', 'Chevrolet', 'chevrolet'),
  ('33333333-3333-3333-3333-333333333003', 'Volkswagen', 'volkswagen')
on conflict (id) do nothing;

insert into public.models (id, manufacturer_id, name, slug) values
  ('44444444-4444-4444-4444-444444444001', '33333333-3333-3333-3333-333333333001', 'Palio', 'palio'),
  ('44444444-4444-4444-4444-444444444002', '33333333-3333-3333-3333-333333333002', 'Onix', 'onix'),
  ('44444444-4444-4444-4444-444444444003', '33333333-3333-3333-3333-333333333003', 'Gol', 'gol')
on conflict (id) do nothing;

insert into public.vehicle_versions (id, manufacturer_id, model_id, year, engine, version_name) values
  ('55555555-5555-5555-5555-555555555001', '33333333-3333-3333-3333-333333333001', '44444444-4444-4444-4444-444444444001', 2015, '1.0', 'Fire'),
  ('55555555-5555-5555-5555-555555555002', '33333333-3333-3333-3333-333333333002', '44444444-4444-4444-4444-444444444002', 2020, '1.0', 'LT'),
  ('55555555-5555-5555-5555-555555555003', '33333333-3333-3333-3333-333333333003', '44444444-4444-4444-4444-444444444003', 2018, '1.6', 'Trendline')
on conflict (id) do nothing;

insert into public.products (id, sku, name, slug, description, brand_id, category_id, price, promo_price, status, manufacturer_code, search_document, is_incomplete, is_available) values
  ('66666666-6666-6666-6666-666666666001', 'FAL-SEED-PIVO-001', 'Pivô de Suspensão (seed)', 'pivo-suspensao-seed', 'Produto fixture da Fase 2 — não é catálogo comercial final.', '22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111014', 89.90, 74.90, 'published', 'SEED-PV-001', 'pivo suspensao palio fiat seed', true, false),
  ('66666666-6666-6666-6666-666666666002', 'FAL-SEED-TERM-001', 'Terminal de Direção (seed)', 'terminal-direcao-seed', 'Produto fixture da Fase 2 — não é catálogo comercial final.', '22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111015', 64.50, null, 'published', 'SEED-TM-001', 'terminal direcao gol volkswagen seed', true, false)
on conflict (id) do nothing;

insert into public.product_references (product_id, code, ref_type, brand_label) values
  ('66666666-6666-6666-6666-666666666001', 'SEED-PV-001', 'manufacturer', 'FAL Seed'),
  ('66666666-6666-6666-6666-666666666001', 'PVI1032', 'competitor', 'Nakata'),
  ('66666666-6666-6666-6666-666666666002', 'SEED-TM-001', 'manufacturer', 'FAL Seed')
on conflict do nothing;

insert into public.product_vehicle_compatibility (product_id, vehicle_version_id, notes) values
  ('66666666-6666-6666-6666-666666666001', '55555555-5555-5555-5555-555555555001', 'Aplicação seed Palio 2015'),
  ('66666666-6666-6666-6666-666666666002', '55555555-5555-5555-5555-555555555003', 'Aplicação seed Gol 2018')
on conflict do nothing;

insert into public.inventory (product_id, quantity_on_hand, quantity_reserved) values
  ('66666666-6666-6666-6666-666666666001', 12, 0),
  ('66666666-6666-6666-6666-666666666002', 8, 0)
on conflict (product_id) do nothing;
