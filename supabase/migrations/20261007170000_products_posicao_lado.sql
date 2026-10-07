-- Atributos de produto: posição e lado (não pertencem à aplicação).

alter table public.products
  add column if not exists posicao text;

alter table public.products
  add column if not exists lado text;

alter table public.products drop constraint if exists products_posicao_check;
alter table public.products
  add constraint products_posicao_check
  check (posicao is null or posicao in ('DIANTEIRA', 'TRASEIRA'));

alter table public.products drop constraint if exists products_lado_check;
alter table public.products
  add constraint products_lado_check
  check (lado is null or lado in ('ESQUERDO', 'DIREITO', 'AMBOS'));

comment on column public.products.posicao is 'Posição da peça no veículo (atributo do produto).';
comment on column public.products.lado is 'Lado da peça (atributo do produto).';
