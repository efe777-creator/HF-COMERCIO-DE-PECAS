-- Validação de posição com combinações no apply de produtos.

create or replace function public._validate_product_posicao(p text)
returns boolean
language sql
immutable
as $$
  select p is null
    or p ~ '^(DIANTEIRA|TRASEIRA|SUPERIOR|INFERIOR)(_(DIANTEIRA|TRASEIRA|SUPERIOR|INFERIOR)){0,3}$';
$$;

-- Atualiza o trecho de validação na RPC (recria a partir da definição atual se o patch textual falhar no CI local).
do $$
declare
  def text;
begin
  def := pg_get_functiondef('public.apply_catalog_products_import(uuid)'::regprocedure);
  if position('v_posicao not in' in def) > 0 then
    def := replace(
      def,
      $old$if v_posicao is not null and v_posicao not in ('DIANTEIRA', 'TRASEIRA') then
      raise exception 'Linha %: posicao invalida (%)', r.line_number, v_posicao
        using errcode = 'P0001';
    end if;$old$,
      $new$if v_posicao is not null and not public._validate_product_posicao(v_posicao) then
      raise exception 'Linha %: posicao invalida (%)', r.line_number, v_posicao
        using errcode = 'P0001';
    end if;$new$
    );
    execute def;
  end if;
end;
$$;
