-- HF: escopo comercial = SUSPENSÃO, DIREÇÃO, FREIOS, TRANSMISSÃO.
-- Arquiva L1/L2 fora do escopo; cria TRANSMISSÃO + grupos; reordena L1.

-- 1) Arquivar fora do escopo (e filhos, via IDs conhecidos do seed)
update public.product_categories
set status = 'archived',
    slug = case
      when slug like 'archived-hf-scope-%' then slug
      else 'archived-hf-scope-' || slug || '-' || substr(id::text, 1, 8)
    end
where status = 'published'
  and (
    id in (
      'a1111111-1111-1111-1111-111111111003', -- ÓLEOS E FLUIDOS
      'a1111111-1111-1111-1111-111111111005', -- FILTROS
      'a1111111-1111-1111-1111-111111111006', -- COMPONENTES DE MANUTENÇÃO
      'a1111111-1111-1111-1111-111111111007', -- OUTRO
      'a1111111-1111-1111-1111-111111111031',
      'a1111111-1111-1111-1111-111111111032',
      'a1111111-1111-1111-1111-111111111033',
      'a1111111-1111-1111-1111-111111111034',
      'a1111111-1111-1111-1111-111111111051',
      'a1111111-1111-1111-1111-111111111052',
      'a1111111-1111-1111-1111-111111111053',
      'a1111111-1111-1111-1111-111111111054',
      'a1111111-1111-1111-1111-111111111061',
      'a1111111-1111-1111-1111-111111111062',
      'a1111111-1111-1111-1111-111111111063',
      'a1111111-1111-1111-1111-111111111064'
    )
    or parent_id in (
      'a1111111-1111-1111-1111-111111111003',
      'a1111111-1111-1111-1111-111111111005',
      'a1111111-1111-1111-1111-111111111006',
      'a1111111-1111-1111-1111-111111111007'
    )
  );

-- 2) Reordenar L1 no escopo
update public.product_categories set sort_order = 10 where id = 'a1111111-1111-1111-1111-111111111001'; -- SUSPENSÃO
update public.product_categories set sort_order = 20 where id = 'a1111111-1111-1111-1111-111111111002'; -- DIREÇÃO
update public.product_categories set sort_order = 30 where id = 'a1111111-1111-1111-1111-111111111004'; -- FREIOS

-- 3) TRANSMISSÃO (L1) + grupos (L2)
insert into public.product_categories (id, parent_id, name, slug, description, sort_order, status) values
  ('a1111111-1111-1111-1111-111111111008', null, 'TRANSMISSÃO', 'transmissao', 'Componentes de transmissão', 40, 'published')
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  parent_id = excluded.parent_id,
  description = excluded.description,
  sort_order = excluded.sort_order,
  status = 'published';

insert into public.product_categories (id, parent_id, name, slug, sort_order, status) values
  ('a1111111-1111-1111-1111-111111111081', 'a1111111-1111-1111-1111-111111111008', 'HOMOCINÉTICA', 'homocinetica', 1, 'published'),
  ('a1111111-1111-1111-1111-111111111082', 'a1111111-1111-1111-1111-111111111008', 'SEMIEIXO', 'semieixo', 2, 'published'),
  ('a1111111-1111-1111-1111-111111111083', 'a1111111-1111-1111-1111-111111111008', 'EMBREAGEM', 'embreagem', 3, 'published'),
  ('a1111111-1111-1111-1111-111111111084', 'a1111111-1111-1111-1111-111111111008', 'OUTROS TRANSMISSÃO', 'outros-transmissao', 9, 'published')
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  parent_id = excluded.parent_id,
  sort_order = excluded.sort_order,
  status = 'published';

-- 4) Garantir L1 no escopo published
update public.product_categories
set status = 'published'
where id in (
  'a1111111-1111-1111-1111-111111111001',
  'a1111111-1111-1111-1111-111111111002',
  'a1111111-1111-1111-1111-111111111004',
  'a1111111-1111-1111-1111-111111111008'
);
