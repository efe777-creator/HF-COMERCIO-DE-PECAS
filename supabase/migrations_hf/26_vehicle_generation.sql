-- Geração opcional na config veicular (vehicle_versions).
-- NULL/vazio = sem geração / serve para todas as gerações do modelo.
alter table public.vehicle_versions
  add column if not exists generation text;

comment on column public.vehicle_versions.generation is
  'Geração do veículo (opcional). NULL/vazio = todas / não aplicável.';
