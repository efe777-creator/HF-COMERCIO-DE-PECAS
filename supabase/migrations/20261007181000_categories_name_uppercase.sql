-- Padroniza nomes de categorias em maiúsculas (pt-BR / UTF-8).

update public.product_categories
set name = upper(name)
where name is distinct from upper(name);
