-- Grupos usados na planilha LISTA SUSP. CATEGORIZACA (import cadastro).
-- Idempotente: não duplica por nome/slug sob o mesmo pai.

insert into public.product_categories (name, slug, parent_id, sort_order, status)
select v.name, v.slug, v.parent_id, v.sort_order, 'published'
from (
  values
    ('KIT AMORTECEDOR', 'kit-amortecedor', 'a1111111-1111-1111-1111-111111111001'::uuid, 20),
    ('COXIM AMORTECEDOR', 'coxim-amortecedor', 'a1111111-1111-1111-1111-111111111001'::uuid, 21),
    ('BIELETA', 'bieleta', 'a1111111-1111-1111-1111-111111111001'::uuid, 22),
    ('BUCHA BANDEJA', 'bucha-bandeja', 'a1111111-1111-1111-1111-111111111001'::uuid, 23),
    ('SUPORTE DA BARRA TENSORA', 'suporte-da-barra-tensora', 'a1111111-1111-1111-1111-111111111001'::uuid, 24),
    ('AXIAL DE DIREÇÃO', 'axial-de-direcao', 'a1111111-1111-1111-1111-111111111002'::uuid, 20)
) as v(name, slug, parent_id, sort_order)
where not exists (
  select 1
  from public.product_categories c
  where c.parent_id = v.parent_id
    and (lower(c.slug) = lower(v.slug) or lower(c.name) = lower(v.name))
);
