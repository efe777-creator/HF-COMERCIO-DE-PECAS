-- Período da configuração veicular (quando aquela geração/versão/motor/combustível existiu).
-- Diferente da fabricação do modelo e do período PVC da peça.
alter table public.vehicle_versions
  add column if not exists year_start int,
  add column if not exists year_end int;

comment on column public.vehicle_versions.year_start is
  'Início do período desta configuração (opcional). NULL = sem início explícito.';
comment on column public.vehicle_versions.year_end is
  'Fim do período desta configuração (opcional). NULL = vigente / aberto.';

-- Backfill a partir do ano ref. legado.
update public.vehicle_versions
set year_start = year
where year is not null
  and year_start is null;
