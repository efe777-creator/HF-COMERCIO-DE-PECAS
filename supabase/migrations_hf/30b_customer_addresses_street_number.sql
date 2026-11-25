-- Idempotente: ambientes que ainda tenham a coluna `number` (PostgREST reserva o nome).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'customer_addresses'
      and column_name = 'number'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'customer_addresses'
      and column_name = 'street_number'
  ) then
    alter table public.customer_addresses rename column number to street_number;
  end if;
end $$;
