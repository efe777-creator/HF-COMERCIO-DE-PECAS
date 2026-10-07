-- Arquiva categorias sem produto (mantém folhas em uso + ancestrais).

with recursive used_leaves as (
  select distinct category_id as id
  from public.products
  where category_id is not null
),
keep_tree as (
  select c.id, c.parent_id
  from public.product_categories c
  where c.id in (select id from used_leaves)
  union
  select p.id, p.parent_id
  from public.product_categories p
  join keep_tree k on k.parent_id = p.id
)
update public.product_categories c
set status = 'archived'
where c.id not in (select id from keep_tree)
  and c.status is distinct from 'archived';
