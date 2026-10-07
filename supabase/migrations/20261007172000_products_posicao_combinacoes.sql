-- Posição: átomos DIANTEIRA|TRASEIRA|SUPERIOR|INFERIOR e combinações (ex. DIANTEIRA_INFERIOR).

alter table public.products drop constraint if exists products_posicao_check;

alter table public.products
  add constraint products_posicao_check
  check (
    posicao is null
    or posicao ~ '^(DIANTEIRA|TRASEIRA|SUPERIOR|INFERIOR)(_(DIANTEIRA|TRASEIRA|SUPERIOR|INFERIOR)){0,3}$'
  );

comment on column public.products.posicao is
  'Posição da peça: DIANTEIRA, TRASEIRA, SUPERIOR, INFERIOR ou combinação com _ (ex. DIANTEIRA_INFERIOR).';
