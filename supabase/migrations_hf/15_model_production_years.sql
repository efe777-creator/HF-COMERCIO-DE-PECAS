-- HF Andar 1: vida de linha do modelo (metadado mestre; não é PVC nem ano da placa).
-- REVERSAO: alter table models drop columns production_year_start, production_year_end, quality_status;

alter table public.models
  add column if not exists production_year_start int,
  add column if not exists production_year_end int,
  add column if not exists quality_status text not null default 'ok'
    check (quality_status in ('ok', 'review', 'quarantined'));

alter table public.models
  drop constraint if exists models_production_year_range_chk;

alter table public.models
  add constraint models_production_year_range_chk
  check (
    production_year_start is null
    or (
      production_year_start >= 1950
      and production_year_start <= 2100
      and (
        production_year_end is null
        or (
          production_year_end >= 1950
          and production_year_end <= 2100
          and production_year_end >= production_year_start
        )
      )
    )
  );

comment on column public.models.production_year_start is
  'Ano inicial de produção/linha do modelo (mestre). Não é PVC nem ano da placa.';
comment on column public.models.production_year_end is
  'Ano final de produção; null = em linha ou desconhecido.';
comment on column public.models.quality_status is
  'Qualidade do cadastro de modelo: ok (padrão), review, quarantined.';