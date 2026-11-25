-- HF Andar 1: atributos de posição na aplicação PVC + status de validação.
-- REVERSAO: alter table product_vehicle_compatibility drop columns lado, posicao_long, posicao_vert, validation_status;

alter table public.product_vehicle_compatibility
  add column if not exists lado text check (lado is null or lado in ('ESQUERDO','DIREITO','AMBOS')),
  add column if not exists posicao_long text check (posicao_long is null or posicao_long in ('DIANTEIRA','TRASEIRA')),
  add column if not exists posicao_vert text check (posicao_vert is null or posicao_vert in ('SUPERIOR','INFERIOR')),
  add column if not exists validation_status text not null default 'draft'
    check (validation_status in ('draft','validated','rejected'));

alter table public.product_vehicle_compatibility
  drop constraint if exists pvc_year_range_chk;

alter table public.product_vehicle_compatibility
  add constraint pvc_year_range_chk
  check (
    year_start is null
    or year_end is null
    or year_start <= year_end
  );

comment on column public.product_vehicle_compatibility.lado is
  'Lado da aplicação no veículo (atributo da PVC, não do produto).';
comment on column public.product_vehicle_compatibility.posicao_long is
  'Posição longitudinal (dianteira/traseira) na aplicação.';
comment on column public.product_vehicle_compatibility.posicao_vert is
  'Posição vertical (superior/inferior) na aplicação.';
comment on column public.product_vehicle_compatibility.validation_status is
  'Ciclo de validação da aplicação: draft → validated | rejected.';