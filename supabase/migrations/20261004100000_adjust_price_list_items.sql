-- Ajuste global atômico de itens de lista de preços (gate pré-F7B).

alter table public.price_change_history
  drop constraint if exists price_change_history_source_check;

alter table public.price_change_history
  add constraint price_change_history_source_check
  check (source in ('manual', 'import', 'system', 'override', 'bulk_adjust'));

create or replace function public.adjust_price_list_items(
  p_price_list_id uuid,
  p_mode text,
  p_value numeric,
  p_changed_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_updated int := 0;
  v_skipped int := 0;
  v_would_zero int := 0;
  v_total int := 0;
  v_sample jsonb := '[]'::jsonb;
  v_rows jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'Nao autenticado' using errcode = '42501';
  end if;

  if not public.is_staff() then
    raise exception 'Somente staff pode ajustar precos' using errcode = '42501';
  end if;

  if p_mode is null or p_mode not in ('percent', 'fixed') then
    raise exception 'Modo invalido: use percent ou fixed' using errcode = 'P0001';
  end if;

  if p_value is null or p_value = 0 or p_value <> p_value then
    raise exception 'Informe um valor de ajuste diferente de zero' using errcode = 'P0001';
  end if;

  if p_mode = 'percent' and abs(p_value) > 100 then
    raise exception 'Percentual deve estar entre -100 e 100' using errcode = 'P0001';
  end if;

  if p_mode = 'percent' and p_value <= -100 then
    raise exception 'Ajuste rejeitado: reducao de 100%% zera a lista' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.price_lists where id = p_price_list_id) then
    raise exception 'Lista de precos nao encontrada' using errcode = 'P0001';
  end if;

  select count(*)::int into v_total
  from public.price_list_items
  where price_list_id = p_price_list_id;

  if v_total = 0 then
    return jsonb_build_object('updated', 0, 'skipped', 0, 'sample', '[]'::jsonb);
  end if;

  select count(*)::int into v_would_zero
  from public.price_list_items pli
  where pli.price_list_id = p_price_list_id
    and greatest(
      0::numeric,
      round(
        case
          when p_mode = 'percent' then pli.price * (1 + p_value / 100.0)
          else pli.price + p_value
        end
      , 2)
    ) = 0
    and pli.price > 0;

  if v_would_zero = v_total then
    raise exception 'Ajuste rejeitado: todos os itens resultariam em R$ 0,00' using errcode = 'P0001';
  end if;

  with calc as (
    select
      pli.product_id,
      pli.price as old_price,
      greatest(
        0::numeric,
        round(
          case
            when p_mode = 'percent' then pli.price * (1 + p_value / 100.0)
            else pli.price + p_value
          end
        , 2)
      ) as new_price
    from public.price_list_items pli
    where pli.price_list_id = p_price_list_id
  ),
  changed as (
    select * from calc where abs(new_price - old_price) >= 0.001
  ),
  upd as (
    update public.price_list_items pli
    set price = c.new_price, updated_at = now()
    from changed c
    where pli.price_list_id = p_price_list_id
      and pli.product_id = c.product_id
    returning c.product_id, c.old_price, c.new_price
  ),
  hist as (
    insert into public.price_change_history (
      product_id, price_list_id, old_price, new_price, changed_by, source
    )
    select
      u.product_id,
      p_price_list_id,
      u.old_price,
      u.new_price,
      coalesce(p_changed_by, v_uid),
      'bulk_adjust'
    from upd u
    returning u.product_id, u.old_price, u.new_price
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'product_id', h.product_id,
      'old', h.old_price,
      'new', h.new_price
    )), '[]'::jsonb)
  into v_rows
  from hist h;

  v_updated := jsonb_array_length(v_rows);
  v_skipped := v_total - v_updated;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'sku', p.sku,
        'old', (elem->>'old')::numeric,
        'new', (elem->>'new')::numeric
      )
      order by p.sku
    ),
    '[]'::jsonb
  )
  into v_sample
  from (
    select value as elem
    from jsonb_array_elements(v_rows) with ordinality as t(value, ord)
    where ord <= 5
  ) s
  join public.products p on p.id = (s.elem->>'product_id')::uuid;

  return jsonb_build_object(
    'updated', v_updated,
    'skipped', v_skipped,
    'sample', coalesce(v_sample, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.adjust_price_list_items(uuid, text, numeric, uuid) from public;
grant execute on function public.adjust_price_list_items(uuid, text, numeric, uuid) to authenticated;
