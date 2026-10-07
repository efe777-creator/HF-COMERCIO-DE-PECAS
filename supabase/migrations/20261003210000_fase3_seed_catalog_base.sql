-- Fase 3: árvore comercial + 22 montadoras + fabricantes/fornecedores mínimos.

-- Liberar slugs das categorias seed F2
update public.product_categories
set status = 'archived',
    slug = 'archived-f2-' || slug || '-' || substr(id::text, 1, 8)
where id in (
  '11111111-1111-1111-1111-111111111001',
  '11111111-1111-1111-1111-111111111002',
  '11111111-1111-1111-1111-111111111003',
  '11111111-1111-1111-1111-111111111011',
  '11111111-1111-1111-1111-111111111012',
  '11111111-1111-1111-1111-111111111013',
  '11111111-1111-1111-1111-111111111014',
  '11111111-1111-1111-1111-111111111015',
  '11111111-1111-1111-1111-111111111021',
  '11111111-1111-1111-1111-111111111022',
  '11111111-1111-1111-1111-111111111031',
  '11111111-1111-1111-1111-111111111032'
)
and slug not like 'archived-f2-%';

insert into public.product_categories (id, parent_id, name, slug, description, sort_order, status) values
  ('a1111111-1111-1111-1111-111111111001', null, 'Suspensão', 'suspensao', 'Componentes de suspensão', 10, 'published'),
  ('a1111111-1111-1111-1111-111111111002', null, 'Direção', 'direcao', 'Componentes de direção', 20, 'published'),
  ('a1111111-1111-1111-1111-111111111003', null, 'Óleos e Fluidos', 'oleos-e-fluidos', null, 30, 'published'),
  ('a1111111-1111-1111-1111-111111111004', null, 'Freios', 'freios', null, 40, 'published'),
  ('a1111111-1111-1111-1111-111111111005', null, 'Filtros', 'filtros', 'Filtros automotivos', 50, 'published'),
  ('a1111111-1111-1111-1111-111111111006', null, 'Componentes de manutenção', 'componentes-de-manutencao', null, 60, 'published'),
  ('a1111111-1111-1111-1111-111111111007', null, 'Outro', 'outro', null, 90, 'published')
on conflict (id) do update set
  name = excluded.name, slug = excluded.slug, parent_id = excluded.parent_id,
  sort_order = excluded.sort_order, status = 'published';

insert into public.product_categories (id, parent_id, name, slug, sort_order, status) values
  ('a1111111-1111-1111-1111-111111111011', 'a1111111-1111-1111-1111-111111111001', 'Pivô', 'pivo', 1, 'published'),
  ('a1111111-1111-1111-1111-111111111012', 'a1111111-1111-1111-1111-111111111001', 'Bandeja', 'bandeja', 2, 'published'),
  ('a1111111-1111-1111-1111-111111111013', 'a1111111-1111-1111-1111-111111111001', 'Buchas', 'buchas', 3, 'published'),
  ('a1111111-1111-1111-1111-111111111014', 'a1111111-1111-1111-1111-111111111001', 'Coxins', 'coxins', 4, 'published'),
  ('a1111111-1111-1111-1111-111111111015', 'a1111111-1111-1111-1111-111111111001', 'Batentes', 'batentes', 5, 'published'),
  ('a1111111-1111-1111-1111-111111111016', 'a1111111-1111-1111-1111-111111111001', 'Amortecedores e kits', 'amortecedores-e-kits', 6, 'published'),
  ('a1111111-1111-1111-1111-111111111021', 'a1111111-1111-1111-1111-111111111002', 'Terminal de direção', 'terminal-de-direcao', 1, 'published'),
  ('a1111111-1111-1111-1111-111111111022', 'a1111111-1111-1111-1111-111111111002', 'Axial', 'axial', 2, 'published'),
  ('a1111111-1111-1111-1111-111111111023', 'a1111111-1111-1111-1111-111111111002', 'Componentes relacionados à direção', 'componentes-relacionados-a-direcao', 3, 'published'),
  ('a1111111-1111-1111-1111-111111111031', 'a1111111-1111-1111-1111-111111111003', 'Óleo de motor', 'oleo-de-motor', 1, 'published'),
  ('a1111111-1111-1111-1111-111111111032', 'a1111111-1111-1111-1111-111111111003', 'Fluido de freio', 'fluido-de-freio', 2, 'published'),
  ('a1111111-1111-1111-1111-111111111033', 'a1111111-1111-1111-1111-111111111003', 'Fluido de arrefecimento', 'fluido-de-arrefecimento', 3, 'published'),
  ('a1111111-1111-1111-1111-111111111034', 'a1111111-1111-1111-1111-111111111003', 'Outros fluidos', 'outros-fluidos', 4, 'published'),
  ('a1111111-1111-1111-1111-111111111041', 'a1111111-1111-1111-1111-111111111004', 'Pastilhas', 'pastilhas', 1, 'published'),
  ('a1111111-1111-1111-1111-111111111042', 'a1111111-1111-1111-1111-111111111004', 'Componentes relacionados', 'componentes-relacionados-freios', 2, 'published'),
  ('a1111111-1111-1111-1111-111111111051', 'a1111111-1111-1111-1111-111111111005', 'Filtro de óleo', 'filtro-de-oleo', 1, 'published'),
  ('a1111111-1111-1111-1111-111111111052', 'a1111111-1111-1111-1111-111111111005', 'Filtro de ar', 'filtro-de-ar', 2, 'published'),
  ('a1111111-1111-1111-1111-111111111053', 'a1111111-1111-1111-1111-111111111005', 'Filtro de combustível', 'filtro-de-combustivel', 3, 'published'),
  ('a1111111-1111-1111-1111-111111111054', 'a1111111-1111-1111-1111-111111111005', 'Filtro de cabine/ar-condicionado', 'filtro-de-cabine-ar-condicionado', 4, 'published'),
  ('a1111111-1111-1111-1111-111111111061', 'a1111111-1111-1111-1111-111111111006', 'Velas', 'velas', 1, 'published'),
  ('a1111111-1111-1111-1111-111111111062', 'a1111111-1111-1111-1111-111111111006', 'Correias', 'correias', 2, 'published'),
  ('a1111111-1111-1111-1111-111111111063', 'a1111111-1111-1111-1111-111111111006', 'Tensores', 'tensores', 3, 'published'),
  ('a1111111-1111-1111-1111-111111111064', 'a1111111-1111-1111-1111-111111111006', 'Outros itens de manutenção', 'outros-itens-de-manutencao', 4, 'published')
on conflict (id) do update set
  name = excluded.name, slug = excluded.slug, parent_id = excluded.parent_id,
  sort_order = excluded.sort_order, status = 'published';

insert into public.manufacturers (name, slug, status) values
  ('Audi', 'audi', 'active'), ('BMW', 'bmw', 'active'), ('BYD', 'byd', 'active'),
  ('CAOA Chery', 'caoa-chery', 'active'), ('Chevrolet', 'chevrolet', 'active'),
  ('Citroën', 'citroen', 'active'), ('Fiat', 'fiat', 'active'), ('GWM', 'gwm', 'active'),
  ('Honda', 'honda', 'active'), ('Hyundai', 'hyundai', 'active'), ('Jaguar', 'jaguar', 'active'),
  ('Jeep', 'jeep', 'active'), ('Land Rover', 'land-rover', 'active'),
  ('Mercedes-Benz', 'mercedes-benz', 'active'), ('Mitsubishi', 'mitsubishi', 'active'),
  ('Nissan', 'nissan', 'active'), ('Peugeot', 'peugeot', 'active'), ('RAM', 'ram', 'active'),
  ('Renault', 'renault', 'active'), ('Suzuki', 'suzuki', 'active'), ('Toyota', 'toyota', 'active'),
  ('Volkswagen', 'volkswagen', 'active')
on conflict (slug) do update set name = excluded.name, status = 'active';

insert into public.product_brands (name, slug, status) values
  ('Nakata', 'nakata', 'active'), ('Cofap', 'cofap', 'active'),
  ('Motorasa', 'motorasa', 'active'), ('Yiming', 'yiming', 'active')
on conflict (slug) do update set name = excluded.name, status = 'active';

insert into public.suppliers (id, name, code, status) values
  ('b2222222-2222-2222-2222-222222222001', 'Fornecedor FAL Principal', 'FAL-SUP-01', 'active')
on conflict (id) do update set name = excluded.name, code = excluded.code, status = 'active';
