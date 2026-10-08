-- HF: árvore comercial inicial (L1+L2) + arquivar legado Motor/Filtros + realocar DEMO/SMOKE.
-- Escopo final HF (só Suspensão/Direção/Freios/Transmissão): ver 11_hf_categories_scope.sql.

-- 1) Arquivar legado HF (libera slug filtros)
update public.product_categories
set status = 'archived',
    slug = 'archived-hf-' || slug || '-' || substr(id::text, 1, 8)
where id in (
  'c1111111-1111-1111-1111-111111111101',
  'c1111111-1111-1111-1111-111111111102'
)
and slug not like 'archived-hf-%';

-- 2) L1 — Categoria (raiz)
insert into public.product_categories (id, parent_id, name, slug, description, sort_order, status) values
  ('a1111111-1111-1111-1111-111111111001', null, 'SUSPENSÃO', 'suspensao', 'Componentes de suspensão', 10, 'published'),
  ('a1111111-1111-1111-1111-111111111002', null, 'DIREÇÃO', 'direcao', 'Componentes de direção', 20, 'published'),
  ('a1111111-1111-1111-1111-111111111003', null, 'ÓLEOS E FLUIDOS', 'oleos-e-fluidos', null, 30, 'published'),
  ('a1111111-1111-1111-1111-111111111004', null, 'FREIOS', 'freios', null, 40, 'published'),
  ('a1111111-1111-1111-1111-111111111005', null, 'FILTROS', 'filtros', 'Filtros automotivos', 50, 'published'),
  ('a1111111-1111-1111-1111-111111111006', null, 'COMPONENTES DE MANUTENÇÃO', 'componentes-de-manutencao', null, 60, 'published'),
  ('a1111111-1111-1111-1111-111111111007', null, 'OUTRO', 'outro', null, 90, 'published')
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  parent_id = excluded.parent_id,
  description = excluded.description,
  sort_order = excluded.sort_order,
  status = 'published';

-- 3) L2 — Grupo
insert into public.product_categories (id, parent_id, name, slug, sort_order, status) values
  ('a1111111-1111-1111-1111-111111111011', 'a1111111-1111-1111-1111-111111111001', 'PIVÔ', 'pivo', 1, 'published'),
  ('a1111111-1111-1111-1111-111111111012', 'a1111111-1111-1111-1111-111111111001', 'BANDEJA', 'bandeja', 2, 'published'),
  ('a1111111-1111-1111-1111-111111111013', 'a1111111-1111-1111-1111-111111111001', 'BUCHAS', 'buchas', 3, 'published'),
  ('a1111111-1111-1111-1111-111111111014', 'a1111111-1111-1111-1111-111111111001', 'COXINS', 'coxins', 4, 'published'),
  ('a1111111-1111-1111-1111-111111111015', 'a1111111-1111-1111-1111-111111111001', 'BATENTES', 'batentes', 5, 'published'),
  ('a1111111-1111-1111-1111-111111111016', 'a1111111-1111-1111-1111-111111111001', 'AMORTECEDORES E KITS', 'amortecedores-e-kits', 6, 'published'),
  ('a1111111-1111-1111-1111-111111111021', 'a1111111-1111-1111-1111-111111111002', 'TERMINAL DE DIREÇÃO', 'terminal-de-direcao', 1, 'published'),
  ('a1111111-1111-1111-1111-111111111022', 'a1111111-1111-1111-1111-111111111002', 'AXIAL', 'axial', 2, 'published'),
  ('a1111111-1111-1111-1111-111111111023', 'a1111111-1111-1111-1111-111111111002', 'COMPONENTES RELACIONADOS À DIREÇÃO', 'componentes-relacionados-a-direcao', 3, 'published'),
  ('a1111111-1111-1111-1111-111111111031', 'a1111111-1111-1111-1111-111111111003', 'ÓLEO DE MOTOR', 'oleo-de-motor', 1, 'published'),
  ('a1111111-1111-1111-1111-111111111032', 'a1111111-1111-1111-1111-111111111003', 'FLUIDO DE FREIO', 'fluido-de-freio', 2, 'published'),
  ('a1111111-1111-1111-1111-111111111033', 'a1111111-1111-1111-1111-111111111003', 'FLUIDO DE ARREFECIMENTO', 'fluido-de-arrefecimento', 3, 'published'),
  ('a1111111-1111-1111-1111-111111111034', 'a1111111-1111-1111-1111-111111111003', 'OUTROS FLUIDOS', 'outros-fluidos', 4, 'published'),
  ('a1111111-1111-1111-1111-111111111041', 'a1111111-1111-1111-1111-111111111004', 'PASTILHAS', 'pastilhas', 1, 'published'),
  ('a1111111-1111-1111-1111-111111111042', 'a1111111-1111-1111-1111-111111111004', 'COMPONENTES RELACIONADOS', 'componentes-relacionados-freios', 2, 'published'),
  ('a1111111-1111-1111-1111-111111111051', 'a1111111-1111-1111-1111-111111111005', 'FILTRO DE ÓLEO', 'filtro-de-oleo', 1, 'published'),
  ('a1111111-1111-1111-1111-111111111052', 'a1111111-1111-1111-1111-111111111005', 'FILTRO DE AR', 'filtro-de-ar', 2, 'published'),
  ('a1111111-1111-1111-1111-111111111053', 'a1111111-1111-1111-1111-111111111005', 'FILTRO DE COMBUSTÍVEL', 'filtro-de-combustivel', 3, 'published'),
  ('a1111111-1111-1111-1111-111111111054', 'a1111111-1111-1111-1111-111111111005', 'FILTRO DE CABINE/AR-CONDICIONADO', 'filtro-de-cabine-ar-condicionado', 4, 'published'),
  ('a1111111-1111-1111-1111-111111111061', 'a1111111-1111-1111-1111-111111111006', 'VELAS', 'velas', 1, 'published'),
  ('a1111111-1111-1111-1111-111111111062', 'a1111111-1111-1111-1111-111111111006', 'CORREIAS', 'correias', 2, 'published'),
  ('a1111111-1111-1111-1111-111111111063', 'a1111111-1111-1111-1111-111111111006', 'TENSORES', 'tensores', 3, 'published'),
  ('a1111111-1111-1111-1111-111111111064', 'a1111111-1111-1111-1111-111111111006', 'OUTROS ITENS DE MANUTENÇÃO', 'outros-itens-de-manutencao', 4, 'published')
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  parent_id = excluded.parent_id,
  sort_order = excluded.sort_order,
  status = 'published';

-- 4) Realocar DEMO/SMOKE → SUSPENSÃO / AMORTECEDORES E KITS
update public.products
set category_id = 'a1111111-1111-1111-1111-111111111016'
where sku in ('HF-DEMO-001', 'HF-SMOKE-01');
