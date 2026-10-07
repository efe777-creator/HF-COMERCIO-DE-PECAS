-- PREPARED — NÃO APLICAR automaticamente (auditoria operacional 2026-10-06).
-- Seed de 3º nível (Subcategoria) sob hierarquia existente.
-- Schema já suporta parent_id; sem ALTER TABLE.
--
-- Exemplos alvo:
--   Suspensão / Bandeja / BANDEJA S/PIVO
--   Suspensão / Bandeja / BANDEJA COMPLETA
--   Óleos e Fluidos / Óleo de motor / 5W30
--   Óleos e Fluidos / Óleo de motor / 10W40
--
-- Pais existentes (seed F3):
--   Suspensão  a1111111-1111-1111-1111-111111111001
--   Bandeja    a1111111-1111-1111-1111-111111111012
--   Óleos…     a1111111-1111-1111-1111-111111111003
--   Óleo motor a1111111-1111-1111-1111-111111111031

insert into public.product_categories (id, parent_id, name, slug, sort_order, status) values
  (
    'a1111111-1111-1111-1111-111111111112',
    'a1111111-1111-1111-1111-111111111012',
    'BANDEJA S/PIVO',
    'bandeja-s-pivo',
    1,
    'published'
  ),
  (
    'a1111111-1111-1111-1111-111111111113',
    'a1111111-1111-1111-1111-111111111012',
    'BANDEJA COMPLETA',
    'bandeja-completa',
    2,
    'published'
  ),
  (
    'a1111111-1111-1111-1111-111111111131',
    'a1111111-1111-1111-1111-111111111031',
    '5W30',
    'oleo-motor-5w30',
    1,
    'published'
  ),
  (
    'a1111111-1111-1111-1111-111111111132',
    'a1111111-1111-1111-1111-111111111031',
    '10W40',
    'oleo-motor-10w40',
    2,
    'published'
  )
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  parent_id = excluded.parent_id,
  sort_order = excluded.sort_order,
  status = 'published';

-- Opcional: alias de Grupo "FLUIDOS" (não renomeia "Óleos e Fluidos" existente).
-- Descomente se quiser o rótulo exato do brief sem migrar produtos.
-- insert into public.product_categories (id, parent_id, name, slug, sort_order, status) values
--   ('a1111111-1111-1111-1111-111111111008', null, 'FLUIDOS', 'fluidos', 31, 'published')
-- on conflict (id) do nothing;
