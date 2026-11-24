-- Equivalências técnicas produto↔produto (bidirecional; sem transitividade).

create table if not exists public.product_equivalences (
  product_id uuid not null references public.products (id) on delete cascade,
  equivalent_product_id uuid not null references public.products (id) on delete cascade,
  evidence text not null default 'cadastro_interno_hf',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_id, equivalent_product_id),
  constraint product_equivalences_no_self check (product_id <> equivalent_product_id)
);

create index if not exists product_equivalences_product_active_idx
  on public.product_equivalences (product_id, active);

create index if not exists product_equivalences_equivalent_idx
  on public.product_equivalences (equivalent_product_id);

comment on table public.product_equivalences is
  'Equivalentes técnicos produto↔produto (pares espelhados). Distinto de referências tipadas e de kits.';

alter table public.product_equivalences enable row level security;

drop policy if exists product_equivalences_select on public.product_equivalences;
create policy product_equivalences_select on public.product_equivalences
  for select to anon, authenticated
  using (
    active = true
    and (
      public.is_staff()
      or public.customer_can_see_product(product_id)
    )
  );

drop policy if exists product_equivalences_write_staff on public.product_equivalences;
create policy product_equivalences_write_staff on public.product_equivalences
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

grant select on public.product_equivalences to anon, authenticated;
grant select, insert, update, delete on public.product_equivalences to authenticated;
